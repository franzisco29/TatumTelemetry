import sys
sys.path.insert(0, '/app')

from database.database import init_db, SessionLocal
from database import crud

def main():
    init_db()
    db = SessionLocal()

    existing = crud.get_user_by_username(db, "admin")
    if existing:
        print("Admin già esistente!")
        db.close()
        return

    user = crud.create_user(
        db,
        username="adminUser",
        password="Admin$TRT24",
        role="engineer",
        is_admin=True
    )
    print(f"✓ Admin creato! ID: {user.id} - Username: adminUser - Password: Admin$TRT24")
    db.close()

if __name__ == "__main__":
    main()