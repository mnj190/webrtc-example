let conn = null;
let senderPeerConnection = null;
let receiverPeerConnection = null;
let senderDataChannel = null;
let receiverDataChannel = null;
let localStream = null;
let remoteStream = new MediaStream();

const remoteVideoElement = document.querySelector('#remote-video-element');
const localVideoElement = document.querySelector('#local-video-element');

const muteBtnElement = document.querySelector('.mute-btn');
const micBtnElement = document.querySelector('.mic-btn');
const screenShareBtnElement = document.querySelector('.screen-share-btn');
const playElement = document.querySelector('.play');


const configuration = {
    "iceServers" : [ {
        "url" : "stun:stun2.1.google.com:19302"
    } ]
};

const constraints = {
    video: true, audio : true
};

window.onload = function() {
    openWebSocket();
    cameraShare();
    remoteVideoElement.srcObject = remoteStream;

    muteBtnElement.addEventListener('click', (e) => {
        remoteVideoElement.muted = !remoteVideoElement.muted;
        const icon = muteBtnElement.children[0];
        icon.classList.toggle('fa-volume-mute', !remoteVideoElement.muted);
        icon.classList.toggle('fa-volume-up', remoteVideoElement.muted);
    })

    micBtnElement.addEventListener('click', (e) => {
        localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled;
        const icon = micBtnElement.children[0];
        icon.classList.toggle('fa-microphone-slash', localStream.getAudioTracks()[0].enabled);
        icon.classList.toggle('fa-microphone', !localStream.getAudioTracks()[0].enabled);
    })

    screenShareBtnElement.addEventListener('click', (e) => {
        screenShare();
        // alert('준비중입니다.');
    })

    playElement.addEventListener('click', (e) => {
        remoteVideoElement.play();
        playElement.style.display = 'none';
    })
};

function openWebSocket() {
    const name = document.querySelector('#name').value;

    // conn = new WebSocket(`ws://58.79.29.12:8080/socket?name=${name}`);
    conn = new WebSocket(`ws://localhost:8080/socket?name=${name}`);

    conn.onopen = (event) => {
        socketSetting();
        // createSenderPeerConnection();
    };
}
function socketSetting() {
    conn.onmessage = (e) => {
        const data = JSON.parse(e.data)
        const event = data.event;

        console.log(data);

        switch (event) {
            case 'offer':
                const offer = data.data;
                createReceiverPeerConnection();
                receiverPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                receiverPeerConnection.createAnswer(function(answer) {
                    receiverPeerConnection.setLocalDescription(answer);
                    send({
                        event : "answer",
                        data : answer
                    });
                }, function(error) {
                    // Handle error here
                });

                break;
            case 'candidate':
                const candidate = data.data;
                receiverPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));

                break;
            case 'answer':
                const answer = data.data;
                senderPeerConnection.setRemoteDescription(new RTCSessionDescription(answer));

                break;
            case 'join':
                createSenderPeerConnection();

                break;
            case 'error':
                const message = data.data;
                alert(message);
                document.querySelector('.back-btn').click();

                break;
            default:
                break;
        }
    };
}

function createSenderPeerConnection() {
    senderPeerConnection = new RTCPeerConnection(configuration);

    if(localStream != null) {
        localStream.getTracks().forEach(function(track) {
            senderPeerConnection.addTrack(track, localStream);
        });
    }

    // peerConnection.ontrack = function(event) {
    //     const track = event.track;
    //     remoteStream.addTrack(track);
    //
    //     console.log(track);
    // };
    senderDataChannel = senderPeerConnection.createDataChannel("dataChannel", { reliable: true });

    senderPeerConnection.createOffer(function(offer) {
        send({
            event : "offer",
            data : offer
        });
        senderPeerConnection.setLocalDescription(offer);
    }, function(error) {
        // Handle error here
    });

    senderPeerConnection.onicecandidate = function(event) {
        if (event.candidate) {
            send({
                event : "candidate",
                data : event.candidate
            });
        }
    };
}

function createReceiverPeerConnection() {
    streamClear(remoteStream);

    receiverPeerConnection = new RTCPeerConnection(configuration);

    receiverPeerConnection.ontrack = function(event) {
        const track = event.track;
        remoteStream.addTrack(track);

        console.log(track);
        remoteVideoElement.play().then().catch(error => {
            console.log(error);
            if(remoteVideoElement.played == 0)
                playElement.style.display = 'block';
        })
    };

    receiverPeerConnection.ondatachannel = function (event) {
        receiverDataChannel = event.channel;

        receiverDataChannel.onmessage = function(event) {
            console.log("Message:", event.data);
        };
    };



    // send({
    //     event : "join",
    //     data : 'createReceiverPeerConnection'
    // });
}

function cameraShare() {
    if(navigator.mediaDevices == undefined) {
        return;
    }

    navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
            remoteVideoElement.srcObject = remoteStream;
            localVideoElement.srcObject = stream;
            localStream = stream;
            // conn = new WebSocket(`ws://localhost:8080/socket?name=${name}`);
            //
            // conn.onopen = (event) => {
            //     socketSetting();
            createSenderPeerConnection();
            // };
        }).catch(function(err) {
        alert('카메라를 사용할 수 없습니다.');
        console.log(err)
    });
}

function screenShare() {
    navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        .then(function(stream) {
            // 스트림을 성공적으로 가져온 경우 화면을 공유합니다.
            // 화면 공유 스트림을 원하는 방식으로 사용합니다.
            remoteVideoElement.srcObject = remoteStream;
            localVideoElement.srcObject = stream;
            localStream = stream;

            createSenderPeerConnection();
        })
        .catch(function(error) {
            console.error('화면 공유 시작 실패:', error);
        });
}

function send(message) {
    conn.send(JSON.stringify(message));
}

function streamClear(stream) {
    remoteStream.getTracks().forEach(track => {
        remoteStream.removeTrack(track);
    });
}
