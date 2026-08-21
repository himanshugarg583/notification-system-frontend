# NotifyDesk — Frontend Client & Admin Panel

This is the frontend application for NotifyDesk, built with **Next.js 14 (App Router)**, React, and Vanilla CSS. It provides both the consumer-facing demo website and the admin control panel.

---

## 1. Local Setup

### Prerequisites
* **Node.js 18+** installed.
* Running Backend API service (default: `http://127.0.0.1:8000`).

### Step-by-Step Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install the required Node packages:
   ```bash
   npm install
   ```

3. Setup the environment variables:
   ```bash
   copy .env.local.example .env.local
   # On macOS/Linux: cp .env.local.example .env.local
   ```
   *Open `.env.local` and fill in the required variables (see Section 2).*

4. Start the local development server:
   ```bash
   npm run dev
   ```
   The site will be live at `http://localhost:3000`.

---

## 2. Environment Variables (`.env.local`)

Create a `.env.local` file in the root of the `frontend` folder. Here are the variables to configure:

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | The URL of your running backend server (e.g. `http://127.0.0.1:8000`). |
| `NEXT_PUBLIC_ONESIGNAL_APP_ID` | The OneSignal App ID used to configure Web Push notifications. |

---

## 3. Features & Navigation

### Consumer Demo Website (`/`)
* **Signup / Sign in / Sign out**: Triggers backend events (`user_signup`, `user_login`, `user_logout`) that fire notifications on enabled channels.
* **Your details (Profile Editor)**: Lets you update your Name, Email, and WhatsApp number. These values map to the database and determine notification recipients.
* **Browser Notifications**: Opt-in toggle to subscribe your browser to Web Push notifications via OneSignal.
* **Your activity feed**: Displays all notifications sent to your user in real-time.

### Admin Matrix Control Panel (`/admin`)
* **Matrix View**: Shows triggers as rows and notification channels (WhatsApp, Email, Web Push) as columns.
* **Toggle Channels**: Instantly switch any channel template ON/OFF.
* **Template Editor**: Edit notification body text, subjects, and Meta template names. Click placeholder buttons to inject dynamic variables like `{{name}}` or `{{time}}`.
* **Manual Trigger**: Run any trigger on-demand against your admin user.
* **Test Send**: Send a template instantly to an override email address or phone number.
* **Delivery Log**: Displays a live log timeline of sent notifications, mock outputs, and provider error codes with diagnostic tips.

---

## 4. Local Web Push Testing (OneSignal)

To test Web Push notifications locally:
1. Log into your OneSignal Dashboard and create a new **Web Push** app.
2. In the configuration, select **Local Testing** and set your Site URL to `http://localhost:3000`.
3. Copy the **App ID** and paste it as `NEXT_PUBLIC_ONESIGNAL_APP_ID` in your `frontend/.env.local` and `ONESIGNAL_APP_ID` in `backend/.env`.
4. Run the frontend app locally, click **Enable push on this browser**, and grant permission.

---

## 5. Production Deployment (Vercel)

1. Import the repository into Vercel.
2. Set the **Root Directory** to `frontend`.
3. Add the required environment variables:
   * `NEXT_PUBLIC_API_URL` (Your backend Render URL)
   * `NEXT_PUBLIC_ONESIGNAL_APP_ID`
4. Click **Deploy**.
5. Once deployed, add your Vercel deployment domain to the Site URL list in your OneSignal Web configuration.
