let conn = null;
let peerConnection = null;
let dataChannel = null;
let localStream = null;
let remoteStream = new MediaStream();

const remoteVideoElement = document.querySelector('#remote-video-element');
const localVideoElement = document.querySelector('#local-video-element');

const muteBtnElemnt = document.querySelector('.mute-btn');
const micBtnElemnt = document.querySelector('.mic-btn');

const constraints = {
    video: true,audio : true
};

navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream) {
        remoteVideoElement.srcObject = remoteStream;
        localVideoElement.srcObject = stream;
        localStream = stream;

        const name = document.querySelector('#name').value;

        conn = new WebSocket(`ws://localhost:8080/socket?name=${name}`);

        conn.onopen = (event) => {
            socketSetting();
            createPeearConncetion();
        };
    }).catch(function(err) {
        alert('카메라를 사용할 수 없습니다.');
        console.log(err)
});

window.onload = function() {
    muteBtnElemnt.addEventListener('click', (e) => {
        remoteVideoElement.muted = !remoteVideoElement.muted;
        const icon = muteBtnElemnt.children[0];
        icon.classList.toggle('fa-volume-mute', !remoteVideoElement.muted);
        icon.classList.toggle('fa-volume-up', remoteVideoElement.muted);
    })

    micBtnElemnt.addEventListener('click', (e) => {
        localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled;
        const icon = micBtnElemnt.children[0];
        icon.classList.toggle('fa-microphone-slash', localStream.getAudioTracks()[0].enabled);
        icon.classList.toggle('fa-microphone', !localStream.getAudioTracks()[0].enabled);
    })
};

function socketSetting() {
    conn.onmessage = (e) => {
        const data = JSON.parse(e.data)
        const event = data.event;

        switch (event) {
            case 'offer':
                const offer = data.data;
                peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                peerConnection.createAnswer(function(answer) {
                    peerConnection.setLocalDescription(answer);
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
                peerConnection.addIceCandidate(new RTCIceCandidate(candidate));

                break;
            case 'answer':
                const answer = data.data;
                peerConnection.setRemoteDescription(new RTCSessionDescription(answer));

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

function createPeearConncetion() {
    peerConnection = new RTCPeerConnection(null);

    localStream.getTracks().forEach(function(track) {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = function(event) {
        const track = event.track;
        remoteStream.addTrack(track);

        console.log(track);
    };

    peerConnection.createOffer(function(offer) {
        send({
            event : "offer",
            data : offer
        });
        peerConnection.setLocalDescription(offer);
    }, function(error) {
        // Handle error here
    });

    peerConnection.onicecandidate = function(event) {
        if (event.candidate) {
            send({
                event : "candidate",
                data : event.candidate
            });
        }
    };

    peerConnection.ondatachannel = function (event) {
        dataChannel = event.channel;
    };
}

function send(message) {
    conn.send(JSON.stringify(message));
}
