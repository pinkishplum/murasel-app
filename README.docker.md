# Docker Setup for Murasel

This document explains how to run the Murasel application using Docker.

## Prerequisites

- Docker and Docker Compose installed on your machine
- Git repository cloned to your local machine

## Running in Production Mode

To run the application in production mode:

```bash
docker-compose up -d
```

This will:
1. Build the Next.js application
2. Start a MongoDB container
3. Start the application container
4. Expose the application on port 3000

You can access the application at http://localhost:3000

## Running in Development Mode

For development with hot-reloading:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

This will:
1. Mount your local code into the container
2. Run the application in development mode with hot-reloading
3. Start a MongoDB container
4. Expose the application on port 3000

Any changes you make to the code will be reflected immediately.

## MongoDB Connection

The MongoDB instance is configured with:
- Username: admin
- Password: secret123
- Database: muraseldb
- Port: 27017

The connection string used by the application is:
```
mongodb://admin:secret123@mongo:27017/muraseldb?authSource=admin
```

## Stopping the Containers

To stop the containers:

```bash
# For production
docker-compose down

# For development
docker-compose -f docker-compose.dev.yml down
```

## Viewing Logs

To view logs:

```bash
# For production
docker-compose logs -f

# For development
docker-compose -f docker-compose.dev.yml logs -f
```

## Troubleshooting

If you encounter issues:

1. Make sure ports 3000 and 27017 are not in use by other applications
2. Check the logs for any error messages
3. Try rebuilding the containers:
   ```bash
   docker-compose build --no-cache
   ```
4. Ensure your .env.local file is properly configured