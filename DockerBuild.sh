echo "Start Build Docker";

# ProjectName/SubName
preVersion="node-feperf-monitor/server";
# Port
outerVisitPort="7415";
innerVisitPort="7414";

# Migrate Configuration
# rm ./config/config.prod.js;
\cp ../server/config/node-feperf-monitor-server/config.prod.js ./config/config.prod.js;

# Stop
echo "Stop Docker Containers";
docker ps;
docker ps|awk '{if (NR!=1) print $1}'| xargs docker stop;

# Remove
echo "Remove Docker Containers";
docker ps -a -q;
docker rm $(docker ps -a -q);

# Generate
randomVersion=${RANDOM};
combinedVersion="${preVersion}:v${randomVersion}"
echo "Generate random version: ${combinedVersion}";

# Build
echo "Build Docker Image: ${combinedVersion}";
docker build -t ${combinedVersion} . -f ./Dockerfile;

# Run
echo "Running Docker ...";
docker run -d -p ${outerVisitPort}:${innerVisitPort} ${combinedVersion};

# Notification
echo "Complete, Visit: http://localhost:${outerVisitPort}";
