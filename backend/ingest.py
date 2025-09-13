#!/usr/bin/env python3
"""
Helper script to ingest documents into ChromaDB
Usage: python ingest.py
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import ingest_documents, initialize_collection

async def main():
    """Main function to run document ingestion"""
    try:
        print("Initializing ChromaDB collection...")
        initialize_collection()
        
        print("Starting document ingestion...")
        result = await ingest_documents()
        
        print(f"✅ Success: {result.message}")
        print(f"📄 Documents processed: {result.documents_processed}")
        print(f"🔗 Chunks created: {result.chunks_created}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
