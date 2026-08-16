pipeline {
    agent {
        docker {
            image 'node:20'
            args '--user root -v /var/run/docker.sock:/var/run/docker.sock'
        }
    }

    environment {
        DOCKER_IMAGE = "dockernavaneeth/ultimate-cicd:${BUILD_NUMBER}"
        DOCKER_REPO  = "dockernavaneeth/ultimate-cicd"
        GIT_REPO_NAME = "node-js-app-pipeline"
        GIT_USER_NAME = "Navaneethkrishna-coder"
    }

    stages {

        stage('Checkout') {
            steps {
                sh '''
                    echo "Starting CI/CD pipeline..."
                    echo "Build Number: ${BUILD_NUMBER}"
                '''
            }
        }

        stage('Build and Test') {
            steps {
                sh '''
                    cd node-app

                    echo "Installing Node.js dependencies..."
                    npm ci

                    echo "Running tests..."
                    npm test
                '''
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('sonarqube') {
                    sh '''
                        echo "Installing Java 17 and SonarScanner..."

                        apt-get update
                        apt-get install -y \
                            openjdk-17-jre-headless \
                            curl \
                            unzip

                        java -version

                        cd node-app

                        curl -L -o sonar-scanner.zip \
                            https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-7.2.0.5079-linux-x64.zip

                        unzip -q sonar-scanner.zip

                        echo "Running SonarQube analysis..."

                        ./sonar-scanner-7.2.0.5079-linux-x64/bin/sonar-scanner \
                            -Dsonar.projectKey=node-express-app \
                            -Dsonar.projectName="Node Express App" \
                            -Dsonar.sources=. \
                            -Dsonar.exclusions=node_modules/**,coverage/** \
                            -Dsonar.host.url=$SONAR_HOST_URL
                    '''
                }
            }
        }

        stage('Install Docker CLI and Buildx') {
            steps {
                sh '''
                    echo "Installing Docker CLI and Buildx..."

                    apt-get update

                    apt-get install -y \
                        ca-certificates \
                        curl

                    install -m 0755 -d /etc/apt/keyrings

                    curl -fsSL https://download.docker.com/linux/debian/gpg \
                        -o /etc/apt/keyrings/docker.asc

                    chmod a+r /etc/apt/keyrings/docker.asc

                    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
                        > /etc/apt/sources.list.d/docker.list

                    apt-get update

                    apt-get install -y \
                        docker-ce-cli \
                        docker-buildx-plugin

                    echo "Docker:"
                    docker --version

                    echo "Buildx:"
                    docker buildx version
                '''
            }
        }

        stage('Build and Push Docker Image') {
            steps {
                sh '''
                    echo "Creating Buildx builder..."

                    docker buildx create \
                        --name jenkins-multiarch \
                        --driver docker-container \
                        --use \
                        || docker buildx use jenkins-multiarch

                    echo "Bootstrapping Buildx..."

                    docker buildx inspect --bootstrap

                    echo "Building multi-platform image..."

                    docker buildx build \
                        --platform linux/amd64,linux/arm64 \
                        -t ${DOCKER_IMAGE} \
                        -t ${DOCKER_REPO}:latest \
                        --push \
                        node-app

                    echo "Docker image pushed successfully:"
                    echo "${DOCKER_IMAGE}"
                '''
            }
        }

        stage('Update Deployment File') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'github-username-password',
                        usernameVariable: 'GITHUB_USERNAME',
                        passwordVariable: 'GITHUB_TOKEN'
                    )
                ]) {
                    sh '''
                        echo "Cloning GitOps repository..."

                        rm -rf repo-temp

                        git clone \
                            https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/${GIT_USER_NAME}/${GIT_REPO_NAME}.git \
                            repo-temp

                        cd repo-temp

                        git config user.email "navaneethkrishna008@gmail.com"
                        git config user.name "${GIT_USER_NAME}"

                        echo "Updating Kubernetes image..."

                        sed -i \
                            "s|image: .*|image: ${DOCKER_IMAGE}|g" \
                            node-app-manifests/deployment.yml

                        echo "Updated deployment:"
                        grep "image:" node-app-manifests/deployment.yml

                        git add node-app-manifests/deployment.yml

                        git commit \
                            -m "Update Node.js app image to ${BUILD_NUMBER} [skip ci]" \
                            || echo "No changes to commit"

                        git push origin main

                        echo "GitOps repository updated successfully."
                    '''
                }
            }
        }
    }

    post {
        success {
            echo '======================================'
            echo 'PIPELINE SUCCESSFUL'
            echo '======================================'
            echo "Docker Image: ${DOCKER_IMAGE}"
            echo 'Argo CD will detect the Git change and sync the application.'
        }

        failure {
            echo '======================================'
            echo 'PIPELINE FAILED'
            echo '======================================'
            echo 'Check the failed stage above.'
        }
    }
}
