pipeline {
  agent {
    docker {
      image 'node:20'
      args '--user root -v /var/run/docker.sock:/var/run/docker.sock -v /var/lib/jenkins/tools:/var/lib/jenkins/tools'
    }
  }

  stages {

    stage('Checkout') {
      steps {
        sh 'echo "Starting build process..."'
      }
    }

    stage('Build and Test') {
      steps {
        sh '''
          cd node-app
          npm ci
          npm test
        '''
      }
    }

    stage('SonarQube Analysis') {
    steps {
        withSonarQubeEnv('sonarqube') {
            script {
                def scannerHome = tool 'sonarscanner'

                sh """
                    apt-get update
                    apt-get install -y openjdk-17-jre-headless

                    cd node-app

                    ${scannerHome}/bin/sonar-scanner \
                      -Dsonar.projectKey=node-express-app \
                      -Dsonar.projectName="Node Express App" \
                      -Dsonar.sources=. \
                      -Dsonar.exclusions=node_modules/**,coverage/**
                """
            }
        }
    }
}
    stage('Install Docker CLI') {
  steps {
    sh '''
      apt-get update
      apt-get install -y ca-certificates curl

      install -m 0755 -d /etc/apt/keyrings

      curl -fsSL https://download.docker.com/linux/debian/gpg \
        -o /etc/apt/keyrings/docker.asc

      chmod a+r /etc/apt/keyrings/docker.asc

      echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
        > /etc/apt/sources.list.d/docker.list

      apt-get update

      apt-get install -y docker-ce-cli

      docker --version
    '''
  }
}
    stage('Build and Push Docker Image') {
      environment {
        DOCKER_IMAGE = "dockernavaneeth/ultimate-cicd:${BUILD_NUMBER}"
      }

      steps {
        script {
          sh 'docker build -t ${DOCKER_IMAGE} node-app'

          def dockerImage = docker.image("${DOCKER_IMAGE}")

          docker.withRegistry(
            'https://index.docker.io/v1/',
            'docker-cred'
          ) {
            dockerImage.push()
            dockerImage.push('latest')
          }
        }
      }
    }

    stage('Update Deployment File') {
      environment {
        GIT_REPO_NAME = "node-js-app-pipeline"
        GIT_USER_NAME = "Navaneethkrishna-coder"
      }

      steps {
        withCredentials([
          usernamePassword(
            credentialsId: 'github',
            usernameVariable: 'GITHUB_USERNAME',
            passwordVariable: 'GITHUB_TOKEN'
          )
        ]) {
          sh '''
            rm -rf repo-temp

            git clone https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/${GIT_USER_NAME}/${GIT_REPO_NAME}.git repo-temp

            cd repo-temp

            git config user.email "navaneethkrishna008@gmail.com"
            git config user.name "${GIT_USER_NAME}"

            sed -i "s|image: .*|image: dockernavaneeth/ultimate-cicd:${BUILD_NUMBER}|g" node-app-manifests/deployment.yml

            git add node-app-manifests/deployment.yml

            git commit -m "Update Node.js app image tag to ${BUILD_NUMBER} [skip ci]" || echo "No changes to commit"

            git push origin main
          '''
        }
      }
    }
  }
}
