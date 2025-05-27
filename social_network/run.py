if __name__ == '__main__':
    # Запуск приложения с SocketIO
    socketio.run(myapp, host="0.0.0.0", port=3001, allow_unsafe_werkzeug=True) 