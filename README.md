# ClickN'Go E-commerce Platform

## Project Description
ClickN'Go is a web-based e-commerce platform designed for selling PC parts, Windows keys, and computer presets. It also features a marketplace where logged-in users can sell their own parts with a commission. The project is developed for school purposes, focusing on core functionalities like user accounts, a shopping cart, product management, and an admin panel. All transactions and shipments are simulated.

## Features

### User Management
*   User registration and login.
*   Login with either email or username.
*   Secure password hashing using `bcrypt`.
*   Session-based authentication.
*   Forced credential change for new admin users on first login.
*   User account page to view profile information.
*   Order history and tracking on the account page.

### Product Catalog
*   Browse all available products.
*   View detailed product information.
*   Search products by name or description.
*   Filter products by tags, minimum price, and maximum price.
*   Product tags displayed on product cards and detail pages.

### Shopping Cart & Checkout
*   Add products to a session-based shopping cart.
*   View and manage items in the cart.
*   Confirmation page after adding a product to the cart.
*   Checkout process with fake payment and shipping information.
*   Order placement with database storage for orders and order items.
*   Fake shipment tracking with status updates (Pending, Shipped, Out for Delivery, Delivered).
*   Client-side formatting and validation for credit card inputs.

### Admin Panel
*   Protected admin dashboard accessible only to users with the 'admin' role.
*   Manage promotions:
    *   List all promotions.
    *   Create new global promotions, coupons, category discounts, or product discounts.
    *   Edit existing promotions.
    *   Delete promotions.

### UI/UX
*   Modern, responsive design with dark/light theme toggling.
*   Integrated search bar with a dropdown filter for categories and price range.
*   Dynamic cart badge showing item count.
*   Clear error messages for login/registration.
*   Favicon for browser tabs.

## Technologies Used
*   **Backend:** Node.js, Express.js
*   **Database:** MariaDB (via `mysql2/promise`)
*   **Templating:** EJS
*   **Authentication:** `bcrypt` for password hashing, `express-session` for session management.
*   **Frontend:** HTML5, CSS3, JavaScript

## Setup and Installation

### 0. Environment Variables
Create a `.env` file in the root directory of the project with the following content, replacing the values with your database credentials:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_DATABASE=clickngo
```
*   **DB_HOST**: Your database host (e.g., `localhost`).
*   **DB_USER**: Your database username.
*   **DB_PASSWORD**: Your database password.
*   **DB_DATABASE**: The name of your database.

### Prerequisites
*   Node.js (LTS version recommended)
*   npm (Node Package Manager)
*   MariaDB or MySQL server running locally (e.g., via WAMP, XAMPP, MAMP, or Docker).
    *   Ensure your MariaDB/MySQL user `root` has no password for local development, or update `src/db.js` accordingly.

### 1. Clone the Repository
```bash
# (Assuming you have a git repository)
# git clone <repository_url>
# cd click-n-go
```

### 2. Install Dependencies
Navigate to the project root directory and install the required Node.js packages:
```bash
npm install
```

### 3. Database Setup
Initialize your database schema and populate it with sample data and an admin user:
```bash
npm run db:init
```
*   **Admin User:** An admin user will be created with `username: admin`, `email: admin@gmail.com`, and `password: admin`. You will be prompted to change these credentials on your first login.

### 4. Run the Application

#### Using Node.js (Local Development)
Start the Node.js server:
```bash
npm start
```

#### Using Docker (Recommended for Production/Consistent Environments)

1.  **Ensure Docker is Running:** Make sure Docker Desktop or your Docker daemon is active.

2.  **Build and Run Containers:** Navigate to the project root directory and execute:
    ```bash
    docker-compose up --build
    ```
    This command will:
    *   Build the `app` service image using the `Dockerfile`.
    *   Start the `app` container (your Node.js application).
    *   Start the `db` container (MariaDB database).
    *   Map port `3000` of the host to port `3000` of the `app` container.
    *   Map port `3306` of the host to port `3306` of the `db` container.

3.  **Initialize Database (for Docker):**
    After the containers are up and running for the first time, you need to initialize the database within the Docker environment. Open a new terminal in the project root and run:
    ```bash
    docker-compose exec app npm run db:init
    ```
    This executes `npm run db:init` inside your running `app` container.

4.  **Stop Containers:** To stop the containers, press `Ctrl+C` in the terminal where `docker-compose up` is running. To stop and remove containers, networks, and volumes (except named volumes like `db_data`), use:
    ```bash
    docker-compose down
    ```
    To remove named volumes as well (which will delete your database data), use:
    ```bash
    docker-compose down --volumes
    ```

### 5. Access the Application
Open your web browser and navigate to:
```
http://localhost:3000
```

## Admin Access
To access the admin panel, log in with the default admin credentials (`admin@gmail.com` / `admin`). You will be forced to change your password and username/email on first login. After that, an "Admin Panel" link will appear in the header.

## Important Notes
*   This project is for educational purposes. Transactions and shipments are simulated and do not involve real money or logistics.
*   Ensure your database server is running before executing `npm run db:init` or `npm start`.
*   If you encounter `ER_TOO_LONG_KEY` errors during database initialization, ensure your MySQL/MariaDB server is configured to use `innodb_large_prefix=ON` and `innodb_file_format=Barracuda` or reduce the length of `VARCHAR` columns used in unique indexes (e.g., `googleId` if re-adding Google Auth).

---

## 🗺️ Roadmap

### Objectifs
- [ ] Add second hand selling
- [ ] PWA (Progressive Web App)  
- [ ] Client Service
- [ ] Add Automatic way to add part to the store (https://github.com/docyx/pc-part-dataset?tab=readme-ov-file)
