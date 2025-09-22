# Frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm i --only=production

COPY frontend/ ./

RUN npm run build

# Backend
FROM golang:1.24.1-alpine AS backend-builder

RUN apk add --no-cache build-base

WORKDIR /app/backend

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./

# Build the Go application
# -ldflags="-w -s" reduces binary size
# CGO_ENABLED=0 creates a static binary, good for alpine images
RUN GOOS=linux go build -ldflags="-w -s" -o /app/server ./main.go

# Final Image
FROM alpine:latest

WORKDIR /app

COPY --from=backend-builder /app/server .
COPY --from=backend-builder /app/backend/database-migrations ./database-migrations
COPY --from=frontend-builder /app/frontend/out ./static

EXPOSE 8080
CMD ["/app/server"]
