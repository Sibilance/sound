import flask


app = flask.Flask(__name__)


@app.route('/')
def index():
    return flask.redirect(flask.url_for('static', filename='sound.html'))


def main():
    app.run()

    
if __name__ == '__main__':
    main()
