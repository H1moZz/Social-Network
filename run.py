import eventlet
eventlet.monkey_patch()

from social_network.app import create_app
from social_network.routes.web_socket import socketio
import os

myapp = create_app()
socketio.init_app(myapp, cors_allowed_origins="*")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    socketio.run(myapp, host="0.0.0.0", port=port, allow_unsafe_werkzeug=True)