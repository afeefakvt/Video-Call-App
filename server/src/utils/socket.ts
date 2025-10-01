import { Server as SocketIOServer} from "socket.io";
import http from 'http';


export const initializeSocket = (server:http.Server)=>{
    const io = new SocketIOServer(server,{
        cors:{
            origin:process.env.FRONTEND_URL,
            methods: ["GET","POST"]
        }

    });

    io.on('connection',(socket)=>{
        console.log('socket connected', socket.id);

        socket.on('join',(roomId:string)=>{
            const room = io.sockets.adapter.rooms.get(roomId);
            const numClients = room?room.size:0
            console.log(`Join room ${roomId} (Cliens now ${numClients + 1})`);

            if(numClients>=2){
                socket.emit('room-full')
                return;
            }
            socket.join(roomId)

            if(numClients===1){
                // Second peer joined: notify the joining socket to create offer
                socket.emit('createOffer');
                //optional :notify the already present peer
                socket.to(roomId).emit('peer-joined') ;

            }else{
                // First peer created room
                socket.emit('created')
            }
            
        });

        socket.on('offer',({sdp,roomId}:{sdp:any,roomId:string})=>{
            socket.to(roomId).emit('offer',sdp)
        });

        socket.on('answer',({sdp,roomId}:{sdp:any; roomId:string})=>{
            socket.to(roomId).emit('answer',sdp);
        });

        socket.on('candidate',({candidate,roomId}:{candidate:any, roomId:string})=>{
            socket.to(roomId).emit('candidate',candidate);
        });

        socket.on('leave',(roomId:string)=>{
            socket.leave(roomId);
            socket.to(roomId).emit('peer-left');
        });

        socket.on('disconnecting',()=>{
            //notify other peers in room the scoket was part of
            for(const roomId of socket.rooms){
                if(roomId===socket.id){
                    socket.to(roomId).emit('peer-left');
                }
            }
        });
    });
};