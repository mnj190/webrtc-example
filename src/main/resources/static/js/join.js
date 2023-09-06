let conn = null;
let peerConnection = null;
let dataChannel = null;
let localStream = new MediaStream();
let remoteStream = new MediaStream();

const constraints = {
    video: true,audio : false
};


navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream) {
        const remoteVideoElement = document.querySelector('#remote-video-element');
        remoteVideoElement.srcObject = remoteStream;

        const localVideoElement = document.querySelector('#local-video-element');
        // localVideoElement.srcObject = stream;

        stream.getTracks().forEach(function (track) {
            localStream.addTrack(track);
        });

        // localStream = stream;
    }).catch(function(err) {
        alert("카메라를 사용할 수 없습니다.");
        console.log(err)
});

window.onload = function() {
    const localVideoElement = document.querySelector('#local-video-element');
    localVideoElement.srcObject = localStream;

    const remoteVideoElement = document.querySelector('#remote-video-element');
    remoteVideoElement.srcObject = remoteStream;


    const name = document.querySelector('#name').value;



    conn = new WebSocket(`ws://localhost:8080/socket?name=${name}`);

    conn.onopen = (event) => {
        socketSetting();
        createPeearConncetion();
    };

    document.querySelector('.screen-change-btn').addEventListener('click', (e) => {
        navigator.mediaDevices.getDisplayMedia({ video: true, audio : true }).then(
            function(stream) {
                streamClear(localStream);

                stream.getTracks().forEach(function (track) {
                    console.log('test');
                    localStream.addTrack(track);
                });

                createPeearConncetion();
            }
        );
    })
};

function socketSetting() {
    const remoteVideoElement = document.querySelector('#remote-video-element');

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

    if(localStream != null) {
        localStream.getTracks().forEach(function (track) {
            peerConnection.addTrack(track, localStream);
        });
    }

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

    peerConnection.onconnectionstatechange = function (event) {
        if (peerConnection.iceConnectionState === 'disconnected') {
            const remoteVideoElement = document.querySelector('#remote-video-element');
            remoteVideoElement.srcObject = remoteStream;
        }
    };
}

function send(message) {
    conn.send(JSON.stringify(message));
}

function submit(e) {
    console.log(e.closest('form').submit());
}

function streamClear(stream) {
    if(stream != null) {
        stream.getTracks().forEach(track => track.stop());
    }
}

