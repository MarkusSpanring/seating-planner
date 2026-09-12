import http.server
import socketserver
import json
import os
import urllib.parse

PORT = 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATES_DIR = os.path.join(BASE_DIR, 'states')
LEGACY_STATE_FILE = os.path.join(BASE_DIR, 'sitzplan_state.json')
ACTIVE_VENUE_FILE = os.path.join(STATES_DIR, '_active.json')

DEFAULT_VENUE_NAME = 'Hauptsaal'

def sanitize_venue_name(name):
    if not name or not isinstance(name, str):
        return DEFAULT_VENUE_NAME
    safe = name.replace('/', '').replace('\\', '').replace('..', '').strip()
    return safe or DEFAULT_VENUE_NAME

def get_venue_file_path(name):
    safe = sanitize_venue_name(name)
    return os.path.join(STATES_DIR, f"{safe}.json")

def ensure_states_dir():
    os.makedirs(STATES_DIR, exist_ok=True)
    hauptsaal_file = get_venue_file_path(DEFAULT_VENUE_NAME)
    
    # 1. Migrate from root sitzplan_state.json if present
    if os.path.exists(LEGACY_STATE_FILE) and not os.path.exists(hauptsaal_file):
        print(f"Migrating {LEGACY_STATE_FILE} to {hauptsaal_file}...")
        try:
            with open(LEGACY_STATE_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            data['venueName'] = DEFAULT_VENUE_NAME
            with open(hauptsaal_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            bak_file = LEGACY_STATE_FILE + '.bak'
            if not os.path.exists(bak_file):
                with open(bak_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False)
        except Exception as e:
            print(f"Migration error: {e}")

    # 2. If no venue file exists, initialize default Hauptsaal
    if not os.path.exists(hauptsaal_file):
        default_data = {
            "venueName": DEFAULT_VENUE_NAME,
            "venueWidth": 1500,
            "venueHeight": 1000,
            "guests": [],
            "dietOptions": [
                {"id": "none", "name": "None", "color": "#6b7280"},
                {"id": "vegetarian", "name": "Vegetarian", "color": "#22c55e"},
                {"id": "vegan", "name": "Vegan", "color": "#a855f7"},
                {"id": "gluten-free", "name": "Gluten-free", "color": "#f97316"}
            ],
            "ageGroups": [
                {"id": "age-adult", "name": "Erwachsen"},
                {"id": "age-under12", "name": "< 12 J."},
                {"id": "age-under6", "name": "< 6 J."},
                {"id": "age-under3", "name": "< 3 J."}
            ],
            "tables": [],
            "families": [],
            "customBlueprints": []
        }
        with open(hauptsaal_file, 'w', encoding='utf-8') as f:
            json.dump(default_data, f, indent=2, ensure_ascii=False)

def list_venues():
    ensure_states_dir()
    venues = []
    for fname in sorted(os.listdir(STATES_DIR)):
        if fname.endswith('.json') and not fname.startswith(('_', '.')):
            vname = fname[:-5]
            fpath = os.path.join(STATES_DIR, fname)
            tbl_count = 0
            guest_count = 0
            try:
                with open(fpath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    vname = data.get('venueName') or vname
                    tbl_count = len(data.get('tables', []))
                    guest_count = len(data.get('guests', []))
            except Exception:
                pass
            venues.append({
                'id': fname[:-5],
                'name': vname,
                'tableCount': tbl_count,
                'guestCount': guest_count
            })
    return venues

def get_active_venue():
    if os.path.exists(ACTIVE_VENUE_FILE):
        try:
            with open(ACTIVE_VENUE_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                active = data.get('activeVenue')
                if active and os.path.exists(get_venue_file_path(active)):
                    return active
        except Exception:
            pass
    venues = list_venues()
    if venues:
        return venues[0]['name']
    return DEFAULT_VENUE_NAME

def set_active_venue(name):
    safe = sanitize_venue_name(name)
    with open(ACTIVE_VENUE_FILE, 'w', encoding='utf-8') as f:
        json.dump({'activeVenue': safe}, f, ensure_ascii=False)

class Handler(http.server.SimpleHTTPRequestHandler):
    def send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip('/')
        query = urllib.parse.parse_qs(parsed.query)

        if path == '/api/venues':
            venues = list_venues()
            active = get_active_venue()
            self.send_json(200, {'venues': venues, 'activeVenue': active})
            return

        if path == '/api/state':
            ensure_states_dir()
            venue_param = query.get('venue', [None])[0]
            venue_name = sanitize_venue_name(venue_param) if venue_param else get_active_venue()
            fpath = get_venue_file_path(venue_name)
            
            if os.path.exists(fpath):
                try:
                    with open(fpath, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    data['venueName'] = data.get('venueName') or venue_name
                    self.send_json(200, data)
                except Exception as e:
                    self.send_json(500, {'error': f'Failed to read state: {str(e)}'})
            else:
                self.send_json(404, {'error': f'Venue "{venue_name}" not found'})
            return

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip('/')
        query = urllib.parse.parse_qs(parsed.query)

        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b'{}'

        try:
            payload = json.loads(post_data.decode('utf-8')) if post_data else {}
        except json.JSONDecodeError:
            self.send_json(400, {'error': 'Invalid JSON'})
            return

        if path == '/api/state':
            ensure_states_dir()
            venue_param = query.get('venue', [None])[0] or payload.get('venueName')
            venue_name = sanitize_venue_name(venue_param) if venue_param else get_active_venue()
            fpath = get_venue_file_path(venue_name)

            payload['venueName'] = venue_name
            try:
                with open(fpath, 'w', encoding='utf-8') as f:
                    json.dump(payload, f, indent=2, ensure_ascii=False)
                set_active_venue(venue_name)
                self.send_json(200, {'status': 'ok', 'venue': venue_name})
            except Exception as e:
                self.send_json(500, {'error': f'Failed to write state: {str(e)}'})
            return

        if path == '/api/venues/create':
            ensure_states_dir()
            name = sanitize_venue_name(payload.get('name', ''))
            fpath = get_venue_file_path(name)

            if os.path.exists(fpath):
                self.send_json(400, {'error': f'Venue "{name}" existiert bereits'})
                return

            initial = payload.get('initialState') or {}
            initial['venueName'] = name
            initial.setdefault('venueWidth', 1500)
            initial.setdefault('venueHeight', 1000)
            initial.setdefault('guests', [])
            initial.setdefault('tables', [])
            initial.setdefault('dietOptions', [
                {"id": "none", "name": "None", "color": "#6b7280"},
                {"id": "vegetarian", "name": "Vegetarian", "color": "#22c55e"},
                {"id": "vegan", "name": "Vegan", "color": "#a855f7"},
                {"id": "gluten-free", "name": "Gluten-free", "color": "#f97316"}
            ])
            initial.setdefault('ageGroups', [
                {"id": "age-adult", "name": "Erwachsen"},
                {"id": "age-under12", "name": "< 12 J."},
                {"id": "age-under6", "name": "< 6 J."},
                {"id": "age-under3", "name": "< 3 J."}
            ])
            initial.setdefault('families', [])
            initial.setdefault('customBlueprints', [])

            try:
                with open(fpath, 'w', encoding='utf-8') as f:
                    json.dump(initial, f, indent=2, ensure_ascii=False)
                set_active_venue(name)
                self.send_json(200, {'status': 'ok', 'venue': name})
            except Exception as e:
                self.send_json(500, {'error': f'Failed to create venue: {str(e)}'})
            return

        if path == '/api/venues/rename':
            ensure_states_dir()
            old_name = sanitize_venue_name(payload.get('oldName', ''))
            new_name = sanitize_venue_name(payload.get('newName', ''))

            if not old_name or not new_name:
                self.send_json(400, {'error': 'Ungültiger Name'})
                return

            old_path = get_venue_file_path(old_name)
            new_path = get_venue_file_path(new_name)

            if not os.path.exists(old_path):
                self.send_json(404, {'error': f'Venue "{old_name}" nicht gefunden'})
                return

            if old_path != new_path and os.path.exists(new_path):
                self.send_json(400, {'error': f'Venue "{new_name}" existiert bereits'})
                return

            try:
                with open(old_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                data['venueName'] = new_name
                with open(new_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)

                if old_path != new_path and os.path.exists(old_path):
                    os.remove(old_path)

                if get_active_venue() == old_name:
                    set_active_venue(new_name)

                self.send_json(200, {'status': 'ok', 'venue': new_name})
            except Exception as e:
                self.send_json(500, {'error': f'Failed to rename venue: {str(e)}'})
            return

        if path == '/api/venues/delete':
            ensure_states_dir()
            name = sanitize_venue_name(payload.get('name', ''))
            fpath = get_venue_file_path(name)

            venues = list_venues()
            if len(venues) <= 1:
                self.send_json(400, {'error': 'Die letzte verbleibende Venue kann nicht gelöscht werden.'})
                return

            if not os.path.exists(fpath):
                self.send_json(404, {'error': f'Venue "{name}" nicht gefunden'})
                return

            try:
                os.remove(fpath)
                remaining = list_venues()
                new_active = remaining[0]['name'] if remaining else DEFAULT_VENUE_NAME
                if get_active_venue() == name:
                    set_active_venue(new_active)
                self.send_json(200, {'status': 'ok', 'activeVenue': get_active_venue()})
            except Exception as e:
                self.send_json(500, {'error': f'Failed to delete venue: {str(e)}'})
            return

        if path == '/api/venues/active':
            name = sanitize_venue_name(payload.get('name', ''))
            if os.path.exists(get_venue_file_path(name)):
                set_active_venue(name)
                self.send_json(200, {'status': 'ok', 'activeVenue': name})
            else:
                self.send_json(404, {'error': f'Venue "{name}" nicht gefunden'})
            return

        self.send_json(404, {'error': 'Not found'})

ensure_states_dir()

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True
    def server_bind(self):
        import socket
        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            if hasattr(socket, 'SO_REUSEPORT'):
                self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
        except Exception:
            pass
        super().server_bind()

if __name__ == '__main__':
    with ReusableTCPServer(("0.0.0.0", PORT), Handler) as httpd:
        print(f"Serving at port {PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping server...")
            httpd.shutdown()

