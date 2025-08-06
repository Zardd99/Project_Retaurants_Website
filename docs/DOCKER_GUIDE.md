# Docker Pull/Run guide

- docker pull zarde/restaurant_app_final:latest
- docker run -d -p 5173:5173 --name restaurant-app-final zarde/restaurant_app_final:latest

- open http://localhost:5173 in your browser

# Stop container from running

- docker stop restaurant-app-final

# Container log

- docker log restaurant-app-final
