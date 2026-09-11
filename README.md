# LinkedIn to Google Sheets Monitor - Setup Guide

This Chrome extension automates your outreach tracking by:
1. Detecting when you send a connection request on LinkedIn and logging it to a Google Sheet.
2. Periodically checking if those connections have accepted your request, and updating the sheet automatically.

## Step 1: Prepare Your Google Sheet
Ensure your Google Sheet has exactly this column structure starting from row 1:
- **A**: `S.No`
- **B**: `Name`
- **C**: `Linkedin URL`
- **D**: `Company`
- **E**: `Linkedin Connected?`
- **F**: `Msg Sent?`
- **G**: `Msg sent Date`
- **H**: `Follow Up 1`
- **I**: `Follow Up 2`
- **J**: `Reply Date`

## Step 2: Setup Google Cloud Console (For OAuth)
Because this extension uses the Google Sheets API to write to your personal sheet, you need a free Client ID.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new Project (e.g., "LinkedIn Monitor").
3. Go to **APIs & Services > Library** and search for **Google Sheets API**. Click **Enable**.
4. Go to **APIs & Services > OAuth consent screen**.
   - Choose **External** and hit Create.
   - Fill in the required fields (App name, User support email, Developer contact email). Save and continue.
   - On the Scopes page, add `https://www.googleapis.com/auth/spreadsheets`. Save and continue.
   - Add your own Google email to the **Test users** section. Save.
5. Go to **APIs & Services > Credentials**.
   - Click **Create Credentials > OAuth client ID**.
   - Application type: **Chrome app**.
   - Application ID: You will need to install the unpacked extension first to get this ID. See Step 3.

## Step 3: Install the Extension
1. Open Chrome and go to `chrome://extensions/`.
2. Turn on **Developer mode** (top right corner).
3. Click **Load unpacked** and select the folder containing these project files.
4. The extension will appear in your list. Note its **ID** (a long string of random letters).
5. Go back to your Google Cloud Console (Step 2.5), paste this ID into the **Application ID** field, and click Create.
6. Copy the generated **Client ID**.

## Step 4: Finalize Configuration
1. Open the `manifest.json` file in this project folder.
2. Find the `"oauth2"` section at the bottom.
3. Replace `"YOUR_GOOGLE_CLIENT_ID_HERE"` with the Client ID you copied.
4. Go back to `chrome://extensions/` and click the refresh icon on the extension to reload it with the new ID.

## Step 5: Start Monitoring!
1. Click the extension icon in your Chrome toolbar.
2. Enter your Google Sheet ID (found in the URL of your sheet, between `/d/` and `/edit`).
3. Enter the Tab name (e.g., `Sheet1`).
4. Click **Save Settings**.
5. Click **Sign in with Google** and authorize the app.
6. Click **Start Monitoring**.

You're all set! Go to LinkedIn and send a connection request to test it out.
