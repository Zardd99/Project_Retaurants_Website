# Font-Family: Novecento Sans

# Get images

- docker images --format "{{.ID}}\t{{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}" | sort -k4

# Build Docker images

- docker build -t [myapp] .

# Run with new image

- docker run -p 5173:5173 [myapp]

# tag local image

- docker tag restaurant_app_final:latest yourusername/restaurant_app_final:latest

# push to docker hub

- docker login # Log in to Docker Hub
- docker push zarde/restaurant_app_final:latest
