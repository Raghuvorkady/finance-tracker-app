#!/usr/bin/env python3
"""
Development Server for Ledgerly Finance Tracker.
Binds to 0.0.0.0 so devices on the same Wi-Fi (like an iPhone) can access the app.
"""

import http.server
import socket
import socketserver
import sys
import os

PORT = 4173
HOST = "0.0.0.0"

def get_local_ip():
    """Find the Mac's local Wi-Fi / LAN IP address."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Does not actually send data; used to determine outgoing interface IP
        s.connect(('10.255.255.255', 1))
        ip = s.getsockname()[0]
    except Exception:
        try:
            ip = socket.gethostbyname(socket.gethostname())
        except Exception:
            ip = "127.0.0.1"
    finally:
        s.close()
    return ip

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and disable aggressive caching during development
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    allow_reuse_address = True
    daemon_threads = True

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    local_ip = get_local_ip()
    
    server_address = (HOST, PORT)
    try:
        httpd = ThreadingHTTPServer(server_address, CustomHTTPRequestHandler)
    except OSError as e:
        if e.errno == 48: # Address already in use
            print(f"\n❌ Port {PORT} is already in use by another process.")
            print(f"   To free it up, run: lsof -ti :{PORT} | xargs kill -9")
            print(f"   Then run this command again.\n")
            sys.exit(1)
        raise

    print("\n" + "=" * 58)
    print("  🚀 Ledgerly Development Server Running")
    print("=" * 58)
    print(f"  • On this Mac:     http://localhost:{PORT}")
    print(f"  • On your iPhone:  http://{local_ip}:{PORT}")
    print("=" * 58)
    print("  📱 To test on your iPhone:")
    print("     1. Make sure your iPhone is on the same Wi-Fi network.")
    print(f"     2. Open Safari on your iPhone and go to: http://{local_ip}:{PORT}")
    print("=" * 58)
    print("  Press Ctrl+C to stop the server.\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped.")
        httpd.server_close()

if __name__ == "__main__":
    main()
