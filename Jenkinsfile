pipeline {

    agent {
        docker {
            image 'node:20'
            args '--user root -v /var/run/docker.sock:/var/run/docker.sock'
        }
    }

    environment {
        DOCKER_REPO = "dockernavaneeth/ultimate-cicd"
        DOCKER_IMAGE = "dockernavaneeth/ultimate-cicd:${BUILD_NUMBER}"

        GIT_REPO_NAME = "node-js-app-pipeline"
        GIT_USER_NAME = "Navaneethkrishna-coder"
    }

    stages {

        // ============================================================
        // CHECKOUT
        // ============================================================

        stage('Checkout') {
            steps {
                sh '''
                    echo "======================================"
                    echo "Starting CI/CD Pipeline"
                    echo "Build Number: ${BUILD_NUMBER}"
                    echo "======================================"
                '''
            }
        }


        // ============================================================
        // BUILD & TEST
        // ============================================================

        stage('Build and Test') {
            steps {
                sh '''
                    set -e

                    cd node-app

                    echo "Installing Node.js dependencies..."
                    npm ci

                    echo "Running tests..."
                    npm test

                    echo "======================================"
                    echo "Tests completed successfully"
                    echo "======================================"
                '''
            }
        }


        // ============================================================
        // INSTALL DOCKER CLI + BUILDX
        // ============================================================

        stage('Install Docker CLI and Buildx') {
            steps {
                sh '''
                    set -e

                    echo "Installing Docker CLI and Buildx..."

                    apt-get update -qq

                    apt-get install -y -qq \
                        ca-certificates \
                        curl \
                        git

                    install -m 0755 -d /etc/apt/keyrings

                    curl -fsSL https://download.docker.com/linux/debian/gpg \
                        -o /etc/apt/keyrings/docker.asc

                    chmod a+r /etc/apt/keyrings/docker.asc

                    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
                        > /etc/apt/sources.list.d/docker.list

                    apt-get update -qq

                    apt-get install -y -qq \
                        docker-ce-cli \
                        docker-buildx-plugin

                    echo ""
                    echo "Docker version:"
                    docker --version

                    echo ""
                    echo "Buildx version:"
                    docker buildx version

                    echo ""
                    echo "Docker connection:"
                    docker info
                '''
            }
        }


        // ============================================================
        // SONARQUBE
        // ============================================================

        stage('SonarQube Analysis') {
            steps {

                withSonarQubeEnv('sonarqube') {

                    sh '''
                        set -e

                        echo "======================================"
                        echo "Starting SonarQube Analysis"
                        echo "======================================"

                        docker pull sonarsource/sonar-scanner-cli:latest

                        docker run --rm \
                            --network host \
                            -e SONAR_HOST_URL="${SONAR_HOST_URL}" \
                            -v "${WORKSPACE}/node-app:/usr/src" \
                            sonarsource/sonar-scanner-cli:latest \
                            -Dsonar.projectKey=node-express-app \
                            -Dsonar.projectName="Node Express App" \
                            -Dsonar.sources=. \
                            -Dsonar.exclusions=node_modules/**,coverage/**

                        echo ""
                        echo "======================================"
                        echo "SonarQube Analysis Successful"
                        echo "======================================"
                    '''
                }
            }
        }


        // ============================================================
        // BUILD & PUSH MULTI-ARCH DOCKER IMAGE
        // ============================================================

        stage('Build and Push Docker Image') {

            steps {

                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-credentials',
                        usernameVariable: 'DOCKER_USERNAME',
                        passwordVariable: 'DOCKER_PASSWORD'
                    )
                ]) {

                    sh '''
                        set -e

                        echo "======================================"
                        echo "Docker Hub Login"
                        echo "======================================"

                        echo "$DOCKER_PASSWORD" | docker login \
                            --username "$DOCKER_USERNAME" \
                            --password-stdin

                        echo ""
                        echo "Docker login successful"


                        echo ""
                        echo "======================================"
                        echo "Creating Multi-Architecture Builder"
                        echo "======================================"

                        BUILDER_NAME="jenkins-builder-${BUILD_NUMBER}"

                        docker buildx create \
                            --name "$BUILDER_NAME" \
                            --driver docker-container \
                            --use

                        docker buildx inspect "$BUILDER_NAME" --bootstrap


                        echo ""
                        echo "======================================"
                        echo "Building Multi-Architecture Image"
                        echo "======================================"

                        docker buildx build \
                            --builder "$BUILDER_NAME" \
                            --platform linux/amd64,linux/arm64 \
                            -t "${DOCKER_REPO}:${BUILD_NUMBER}" \
                            -t "${DOCKER_REPO}:latest" \
                            --push \
                            node-app


                        echo ""
                        echo "======================================"
                        echo "Docker Image Successfully Pushed"
                        echo "======================================"

                        echo "Image:"
                        echo "${DOCKER_REPO}:${BUILD_NUMBER}"

                        echo ""
                        echo "Latest:"
                        echo "${DOCKER_REPO}:latest"


                        echo ""
                        echo "Removing temporary builder..."

                        docker buildx rm "$BUILDER_NAME" || true


                        echo ""
                        echo "Logging out from Docker Hub..."

                        docker logout
                    '''
                }
            }
        }


        // ============================================================
        // UPDATE GITOPS DEPLOYMENT
        // ============================================================

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
                        set -e

                        echo "======================================"
                        echo "Updating GitOps Repository"
                        echo "======================================"

                        rm -rf repo-temp

                        git clone \
                            https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/${GIT_USER_NAME}/${GIT_REPO_NAME}.git \
                            repo-temp

                        cd repo-temp


                        echo ""
                        echo "Configuring Git..."

                        git config user.email "navaneethkrishna008@gmail.com"
                        git config user.name "${GIT_USER_NAME}"


                        echo ""
                        echo "Current Docker image:"
                        grep "image:" node-app-manifests/deployment.yml || true


                        echo ""
                        echo "Updating Docker image to:"
                        echo "${DOCKER_IMAGE}"


                        sed -i \
                            "s|image: .*|image: ${DOCKER_IMAGE}|g" \
                            node-app-manifests/deployment.yml


                        echo ""
                        echo "Updated Docker image:"
                        grep "image:" node-app-manifests/deployment.yml


                        echo ""
                        echo "Committing changes..."

                        git add node-app-manifests/deployment.yml

                        git commit \
                            -m "Update Node.js app image to ${BUILD_NUMBER} [skip ci]" \
                            || echo "No changes to commit"


                        echo ""
                        echo "Pushing changes to GitHub..."

                        git push origin main


                        echo ""
                        echo "======================================"
                        echo "GitOps Repository Updated Successfully"
                        echo "======================================"
                    '''
                }
            }
        }
    }


    // ================================================================
    // POST ACTIONS
    // ================================================================

    post {

        success {
            echo '''
======================================
PIPELINE SUCCESSFUL
======================================
'''
            echo "Docker Image: ${DOCKER_IMAGE}"
            echo "Docker Hub Repository: ${DOCKER_REPO}"
            echo ""
            echo "GitOps deployment file updated."
            echo "Argo CD should now detect the Git change and synchronize the application."
        }

        failure {
            echo '''
======================================
PIPELINE FAILED
======================================
'''
            echo "Check the failed stage above."
        }

        always {
            sh '''
                rm -rf repo-temp || true
            '''
        }
    }
}
