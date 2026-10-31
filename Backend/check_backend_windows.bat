@echo off
cd /d %~dp0
call .venv\Scripts\activate.bat
python manage.py check
python manage.py check_existing_schema
pause
