FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first
COPY package.json yarn.lock* ./
RUN yarn install

# Copy the rest of the code
COPY . .

# Expose port
EXPOSE 3000

# Default to development command (override in compose if needed)
CMD ["yarn", "dev"]
