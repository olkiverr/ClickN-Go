# Next Session To-Do

This file outlines the remaining tasks for the project.

## Bug Fixes (Completed)

### Database Connection Issue

*   **Problem:** Pages that require database access (Marketplace, Admin pages) were failing with errors like "Error fetching marketplace items."
*   **Root Cause:** The application was not loading database credentials because the `.env` file was missing.
*   **Solution:** Created a `.env` file with default database credentials.

### Database Initialization Script Update

*   **Problem:** The `init-db.js` script was failing to create all required tables and insert sample data due to SQL syntax errors, specifically with the `settings` table insertion.
*   **Root Cause:** Incorrect SQL syntax for inserting multiple rows into the `settings` table and an unescaped single quote in a string literal.
*   **Solution:** Modified `init-db.js` to use separate `INSERT` statements for settings and correctly escaped the single quote in "ClickN'Go!".

## Phase 2: Chat System (Completed)

The real-time chat system for the marketplace has been successfully implemented.

## Admin Panel Enhancements (Completed)

### User Management (Completed)

*   **API Routes:** Created routes for getting, editing, and deleting users in `src/routes/admin/users.js`.
*   **Views:** Created views for listing and editing users (`views/admin/users.ejs`, `views/admin/edit-user.ejs`).
*   **Integration:** Integrated the user management routes into the main admin router and added a link in the admin dashboard.

### Product Management (Completed)

*   **API Routes:** Created routes for creating, reading, updating, and deleting products in `src/routes/admin/products.js`.
*   **Views:** Created views for listing, creating, and editing products (`views/admin/products.ejs`, `views/admin/create-product.ejs`, `views/admin/edit-product.ejs`).
*   **Integration:** Integrated the product management routes into the main admin router and added a link in the admin dashboard.

### Order Management (Completed)

*   **API Routes:** Created routes for getting and updating orders in `src/routes/admin/orders.js`.
*   **Views:** Created views for listing and viewing orders (`views/admin/orders.ejs`, `views/admin/order-detail.ejs`).
*   **Integration:** Integrated the order management routes into the main admin router and added a link in the admin dashboard.

### Promos Management (Completed)

*   **CRUD Operations:** Implemented full CRUD functionality for promotions.
*   **Order Tracking:** Added the ability to view which orders have used a specific promotion.

## Second-Hand Marketplace (Completed)

*   **CRUD Operations:** Implemented full CRUD functionality for marketplace items (create, read, update, delete).
*   **User Ownership:** Ensured that only the owner of an item can edit or delete it.

## Coupon Code/Promo System (Completed)

*   **API Route:** Created an API route to apply promo codes to the cart.
*   **Cart Integration:** Updated the cart view and logic to handle promo codes and display discounts.
*   **Order Integration:** Updated the order creation process to record used promo codes.

## Checkout Process (Completed)

*   **Review Step:** Added a review step to the checkout process, allowing users to confirm their order before finalizing it.
*   **Two-Step Process:** The checkout process now consists of two steps: entering shipping information and reviewing the order.

## User Account Page (Completed)

*   **View Account:** Implemented a page to display user account information and order history.
*   **Edit Account:** Added the ability for users to edit their account information (username, email, password).

## All planned features are complete.
