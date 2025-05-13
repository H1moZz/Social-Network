from social_network.app import db
from datetime import datetime, timedelta

class Session(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    session_token = db.Column(db.Text,unique=True)
    expires_at = db.Column(db.DateTime, default=lambda: datetime.today() + timedelta(days=365))

class Chat(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.today())
    participants = db.relationship('User', secondary='chat_participants', backref='chats')

    def __repr__(self):
        return f"<Chat {self.id}>"
    
    @staticmethod
    def get_or_create_personal_chat(participant1_id, participant2_id):
        existing_chat = Chat.query.join(chat_participants).filter(
            chat_participants.c.user_id.in_([participant1_id, participant2_id])
        ).group_by(Chat.id).having(db.func.count(chat_participants.c.user_id) == 2).first()

        if existing_chat:
            return existing_chat

        new_chat = Chat()
        db.session.add(new_chat)
        db.session.commit()

        participants = [
            {'chat_id': new_chat.id, 'user_id': participant1_id},
            {'chat_id': new_chat.id, 'user_id': participant2_id},
        ]
        db.session.execute(chat_participants.insert().values(participants))
        db.session.commit()

        return new_chat

chat_participants = db.Table('chat_participants',
    db.Column('chat_id', db.Integer, db.ForeignKey('chat.id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True)
)

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=True)
    media_type = db.Column(db.String(20), nullable=True)
    media_path = db.Column(db.String(200), nullable=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    chat_id = db.Column(db.Integer, db.ForeignKey('chat.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.today())
    is_read = db.Column(db.Boolean, default=False)
    edited = db.Column(db.Boolean, default=False)

    def __repr__(self):
        return f"<Message {self.id}>"
    
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    avatar = db.Column(db.String(200), nullable=True)
    is_deleted = db.Column(db.Boolean, default=False)
    posts = db.relationship('Post', backref='author', lazy=True)

    def __repr__(self):
        return f"<User> {self.username}"

    def __init__(self, username, email, password):
        self.username = username
        self.email = email
        self.password = password

class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    content = db.Column(db.Text, nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    comments = db.relationship('Comment', backref='post', lazy=True)

    def __repr__(self):
        return f"<Post {self.title}>"
    
class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)

    def __repr__(self):
        return f"<Comment {self.id}>"