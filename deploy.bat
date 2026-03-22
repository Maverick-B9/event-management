@echo off
echo.
echo ========================================
echo  Ignited Minds — Firebase Deploy Script
echo ========================================
echo.

echo Step 1: Logging into Firebase...
call firebase login

echo.
echo Step 2: Selecting your Firebase project...
call firebase use --add

echo.
echo Step 3: Deploying Firestore security rules...
call firebase deploy --only firestore:rules

echo.
echo Step 4: Deploying Storage security rules...
call firebase deploy --only storage

echo.
echo Step 5: Building the app...
call npm run build

echo.
echo Step 6: Deploying to Firebase Hosting...
call firebase deploy --only hosting

echo.
echo ✅ Done! Your app is live on Firebase Hosting.
echo    Reminder: Run "node seed.mjs" if you haven't created your admin user yet.
echo.
pause
