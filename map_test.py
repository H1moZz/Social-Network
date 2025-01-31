from social_network.app import create_app
from datetime import datetime

myapp = create_app()

print(myapp.url_map)
