import http.server
import socketserver
import json
import os

PORT = 8000
STATE_FILE = 'sitzplan_state.json'

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/state':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            if os.path.exists(STATE_FILE):
                with open(STATE_FILE, 'r') as f:
                    self.wfile.write(f.read().encode('utf-8'))
            else:
                self.wfile.write(b'{}')
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/state':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                # Validate JSON before writing
                json_data = json.loads(post_data.decode('utf-8'))
                with open(STATE_FILE, 'w') as f:
                    json.dump(json_data, f)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status":"ok"}')
            except json.JSONDecodeError:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'{"error":"Invalid JSON"}')
        else:
            self.send_response(404)
            self.end_headers()

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at port {PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.shutdown()
