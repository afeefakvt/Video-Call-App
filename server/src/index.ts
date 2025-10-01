import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { initializeSocket } from './utils/socket';

const app = express();

app.use(cors({
    origin:process.env.FRONTEND_URL,
    credentials:true
    
}));

app.get('/',(req,res)=>{
    res.send("Signalling server running")
})

const server = http.createServer(app)
initializeSocket(server)

const port = process.env.PORT || 5000
server.listen(port,()=>{
    console.log(`Signalling server listening on ${port}`)
})