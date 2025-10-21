FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first
COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile || yarn install

# Copy the rest of the code
COPY . .

# Build the TypeScript project
RUN yarn build

ENV NODE_ENV=production

# Expose port (Render will provide PORT env var at runtime)
EXPOSE 3000

# Start the compiled server
CMD ["yarn", "start"]
