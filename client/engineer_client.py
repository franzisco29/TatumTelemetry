import asyncio
import websockets
import socket
import sys

VM_IP = "4.232.170.59"
VM_PORT = 30001
LOCAL_UDP_PORT = 20777

async def connect(pilot_port: int):
    uri = f"ws://{VM_IP}:{VM_PORT}/ws/{pilot_port}"
    
    udp = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    print(f"Connessione a pilota porta {pilot_port}...")
    
    async with websockets.connect(uri) as ws:
        print(f"Connesso! Reinvio su localhost:{LOCAL_UDP_PORT}")
        async for message in ws:
            if isinstance(message, bytes):
                udp.sendto(message, ('127.0.0.1', LOCAL_UDP_PORT))
                print(f"Ricevuti {len(message)} bytes")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python engineer_client.py <pilot_port>")
        print("Esempio: python engineer_client.py 20001")
        sys.exit(1)
    
    pilot_port = int(sys.argv[1])
    asyncio.run(connect(pilot_port))