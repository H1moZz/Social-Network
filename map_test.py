from social_network.app import create_app

myapp = create_app()

print(myapp.url_map)