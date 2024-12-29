from social_network.app import create_app

myapp = create_app()

if __name__ == "__main__":
    myapp.run(port = 5000, debug = True)