# Step 1: Use an official Node.js runtime as a parent image
FROM node:16

# Step 2: Set the working directory in the container
WORKDIR /usr/src/app

# Step 3: Copy package.json and package-lock.json into the container
COPY package.json ./

# Step 4: Install dependencies in the container
RUN npm install

# Step 5: Copy the rest of the application files
COPY . .

RUN npm install dotenv

# Step 6: Expose the port your app runs on
EXPOSE 8080

# Step 7: Start the application
CMD ["npm", "start"]
