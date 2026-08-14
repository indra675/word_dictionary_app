from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import database

app = FastAPI()

# Allow the frontend (running on a different origin) to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # fine for local dev, we'll tighten this later
    allow_methods=["*"],
    allow_headers=["*"],
)

# Runs once when the server starts — creates the table if it doesn't exist
@app.on_event("startup")
def startup():
    database.init_db()

# Defines the shape of data the client must send when adding/updating a word
class WordIn(BaseModel):
    meaning: str

@app.post("/words/{word}")
def add_word(word: str, body: WordIn):
    if database.get_word(word):
        raise HTTPException(status_code=400, detail=f"'{word}' already exists.")
    database.add_word(word, body.meaning)
    return {"message": f"'{word}' has been added.", "word": word, "meaning": body.meaning}

@app.get("/words/{word}")
def search_word(word: str):
    result = database.get_word(word)
    if not result:
        raise HTTPException(status_code=404, detail=f"'{word}' not found.")
    return result

@app.get("/words")
def list_words():
    return database.get_all_words()

@app.put("/words/{word}")
def update_word(word: str, body: WordIn):
    if not database.get_word(word):
        raise HTTPException(status_code=404, detail=f"'{word}' not found.")
    database.update_word(word, body.meaning)
    return {"message": f"'{word}' updated.", "word": word, "meaning": body.meaning}

@app.delete("/words/{word}")
def delete_word(word: str):
    if not database.get_word(word):
        raise HTTPException(status_code=404, detail=f"'{word}' not found.")
    database.delete_word(word)
    return {"message": f"'{word}' has been deleted."}