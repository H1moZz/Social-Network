from social_network.app import create_app
from social_network.routes.web_socket import socketio

myapp = create_app()
socketio.init_app(myapp, cors_allowed_origins="*")

if __name__ == "__main__":
    socketio.run(myapp, debug=True, host='localhost', port=3001)