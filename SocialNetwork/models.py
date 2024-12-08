from SocialNetwork import db

class User(db.model):
    id = db.Column(db.Integer, primary_key = True)
    username = db.Column(db.String(80), unique = True, nullable = False)
    email = db.Column(db.String(100), unique = True, nullable = False)

    def __repr__(self):
        return f"<User> {self.username}"
