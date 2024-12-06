from  SocialNetwork import app

@app.route("/")
def homepage():
    return "This is main page"