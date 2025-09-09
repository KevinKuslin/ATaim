FROM python:3.10-slim

# Install sistem dependencies untuk dlib dan OpenCV
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
    libx11-dev \
    libxrender-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Environment variables untuk dlib
ENV DLIB_USE_CUDA=0
ENV DLIB_USE_CUDA_SLOW=0
ENV FORCE_CUDA=0
ENV PATH="/home/user/.local/bin:$PATH"

# Buat user non-root
RUN useradd -m -u 1000 user
USER user

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
