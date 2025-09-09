# Dockerfile untuk HuggingFace Space face-recognition
FROM python:3.10-slim

# Install build tools yang diperlukan untuk dlib dan opencv
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    git \
    wget \
    unzip \
    libgtk-3-dev \
    libboost-all-dev \
    libopenblas-dev \
    liblapack-dev \
    && rm -rf /var/lib/apt/lists/*

# Buat user non-root
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app    

# Copy requirements
COPY --chown=user:root requirements.txt requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

# Copy seluruh project
COPY --chown=user:root . /app

# Command default untuk Spaces (Flask)
CMD ["python", "app.py"]
