import  { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const SIGNALLING_SERVER = import.meta.env.VITE_BACKEND_URL;

const VideoCall = () => {
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const currentRoomRef = useRef<string | null>(null);

    const [roomId,setRoomId] = useState("");
    const [status,setStatus] = useState<'idle' | 'created' | 'waiting' | 'connected' | 'failed'>('idle');
    const [muted,setMuted] = useState(false);
    const [videoOff,setVideoOff] = useState(false); 

    useEffect(()=>{
        const socket = io(SIGNALLING_SERVER);
        socketRef.current = socket;

        socket.on('connect',()=> console.log('Connected to signalling server'));
        socket.on('created',()=>setStatus('created'));
        socket.on('peer-joined',()=> setStatus('waiting'));
        socket.on('createOffer',async()=>{
            await createPeerConnection();

            localStreamRef.current?.getTracks().forEach(track =>{
            pcRef.current?.addTrack(track, localStreamRef.current!);
            });

            const offer = await pcRef.current!.createOffer();
            await pcRef.current!.setLocalDescription(offer);
            socket.emit('offer',{sdp:offer, roomId:currentRoomRef.current!});
        });

        socket.on('offer',async(sdp: RTCSessionDescriptionInit)=>{
            await createPeerConnection();
            await pcRef.current!.setRemoteDescription(new RTCSessionDescription(sdp));

            //add local tracks
            localStreamRef.current?.getTracks().forEach(track=>{
                pcRef.current?.addTrack(track,localStreamRef.current!);
            });

            const answer = await pcRef.current!.createAnswer();
            await pcRef.current!.setLocalDescription(answer);
            socket.emit('answer',{sdp:answer, roomId:currentRoomRef.current});
        });

        socket.on('answer', async(sdp:RTCSessionDescription)=>{
            if(!pcRef.current) return;
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp))
        });

        socket.on('candidate', async(candidate:RTCIceCandidateInit)=>{
            try {
                await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
            
            } catch (error) {
                console.warn('addIceCandidate err', error);
            }
        });

        socket.on('room-full',()=>alert('Room is fullonly 2 peers allowed'));
        socket.on('peer-left', ()=> {cleanupPeer(); setStatus('created');});

        return ()=> {socket.disconnect();};

    },[]);


    const startWebcam = async()=>{
        try {
        const s = await navigator.mediaDevices.getUserMedia({video:true, audio:true})
        localStreamRef.current = s;
        if(localVideoRef.current) localVideoRef.current.srcObject = s;

        } catch (error) {
           console.error(error);
           alert('Cannot access camera/mic'); 
        }
    }

    function joinRoom() {
        if (!roomId.trim()) return alert('Enter room ID');
        currentRoomRef.current = roomId.trim();
        socketRef.current?.emit('join', currentRoomRef.current);
    }


    const createPeerConnection = async()=>{
        if(pcRef.current) return;
        const pc = new RTCPeerConnection({
            iceServers:[{urls: 'stun:stun.l.google.com:19302'}]
        });
        pcRef.current = pc;

        pc.onicecandidate= (ev)=>{
            if(ev.candidate){
                socketRef.current?.emit('candidate',{candidate:ev.candidate, roomId:currentRoomRef.current});
            }
        };

        pc.ontrack = (ev)=>{
            if(remoteVideoRef.current) remoteVideoRef.current.srcObject = ev.streams[0];
            setStatus('connected')
        }

        pc.oniceconnectionstatechange = ()=>{
            const s = pc.iceConnectionState;
            console.log('ICE state',s);
            if(s==='connected' || s==='completed') setStatus('connected');
            else if(s==='disconnected' || s==='failed') setStatus('failed');
            else setStatus('waiting');
            
        };
    }

    function toggleMute() {
        localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = !t.enabled);
        setMuted(prev => !prev);
    }

    function toggleVideo() {
        localStreamRef.current?.getVideoTracks().forEach(t => t.enabled = !t.enabled);
        setVideoOff(prev => !prev);
    }

    const shareScreen = async()=>{
        try {
           const ds = await navigator.mediaDevices.getDisplayMedia({video:true});
           const screenTrack = ds.getVideoTracks()[0];
           const sender = pcRef.current?.getSenders().find(s => s.track?.kind==='video');
           await sender?.replaceTrack(screenTrack);

           //when screen sharing stops revert to camera
           screenTrack.onended = async()=>{
            const camTrack = localStreamRef.current?.getVideoTracks()[0];
            if(camTrack) await sender?.replaceTrack(camTrack);
           };
        } catch (error) {
            console.error(error);
            alert('Screen share failed or cancelled');
        }
    }

    
    function leaveRoom() {
        socketRef.current?.emit('leave', currentRoomRef.current);
        cleanupPeer();
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        currentRoomRef.current = null;
        setStatus('idle');
    }

    function cleanupPeer() {
        pcRef.current?.close();
        pcRef.current = null;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    }

return (
  <div className="p-6 max-w-6xl mx-auto space-y-6">
    <h1 className="text-3xl font-bold text-center text-gray-800">
      1:1 Video Call App
    </h1>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Local Video */}
      <div className="flex flex-col items-center bg-gray-100 p-4 rounded-xl shadow-md">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-64 md:h-80 rounded-lg bg-black object-cover"
        />
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          <button
            onClick={startWebcam}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition"
          >
            Start Webcam
          </button>
          <button
            onClick={toggleMute}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white font-semibold rounded-lg transition"
          >
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            onClick={toggleVideo}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white font-semibold rounded-lg transition"
          >
            {videoOff ? "Enable Video" : "Disable Video"}
          </button>
          <button
            onClick={shareScreen}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
          >
            Share Screen
          </button>
        </div>
      </div>

      {/* Remote Video */}
      <div className="flex flex-col items-center bg-gray-100 p-4 rounded-xl shadow-md">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-64 md:h-80 rounded-lg bg-black object-cover"
        />
        <div className="mt-4 w-full">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID (e.g. room123)"
            />
            <button
              onClick={joinRoom}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition w-full sm:w-auto"
            >
              Join Room
            </button>
            <button
              onClick={leaveRoom}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition w-full sm:w-auto"
            >
              Leave
            </button>
          </div>
          <div className="mt-2 text-center sm:text-left text-gray-600 text-sm">
            Status: <span className="font-medium text-gray-800">{status}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

};

export default VideoCall;
