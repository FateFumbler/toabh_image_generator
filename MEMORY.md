# TOABH AI Image Generator - System Memory

## Overview
A custom web-based dashboard for managing AI image generation and editing for TOABH models.

## Infrastructure
- **Framework:** Flask (Python)
- **Database:** SQLite (SQLAlchemy)
- **AI Models:**
  - **Generation:** FLUX 2 Pro (OpenRouter), Gemini 3 Pro Image (Google AI Studio)
  - **Editing:** Gemini 2.0 Flash
  - **Prompt Analysis:** Gemini 2.0 Flash
- **Storage:** Local file system for reference images and generated outputs.
- **Exposure:** Cloudflare Tunnel (trycloudflare.com).

## Core Modules

### 1. Image Generator
- Selection of model, resolution, and aspect ratio.
- Support for reference images (Reference Sets).
- Bulk generation from prompt library.

### 2. Prompt Library
- Organized by Category and Gender.
- Supports bulk adding and filtering.
- "Favorites" section for preferred prompts.

### 3. Image Editor
- Background editing via natural language instructions.
- Uses Gemini API for instruction-based image modification.
- Queue-based processing.

### 4. Prompt Generator (New - March 16, 2026)
- AI-driven prompt creation from reference images.
- Uses a customizable **Knowledge Base** rule system to ensure consistency.
- Supports batch analysis (up to 20 images).
- Direct integration with Prompt Library for one-click saving.

## Significant Updates & Fixes

### March 16, 2026
- **Prompt Generator Module:** Added to sidebar. Implemented backend analysis logic using Gemini 2.0 Flash and frontend UI for KB management and image uploading.
- **Bug Fix:** Resolved server crash caused by missing `generation_status` global variable.
- **UI Enhancement:** Added a "Dismiss" button to the edit error banner.
- **Config:** Correctly integrated `OPENROUTER_API_KEY` for FLUX support.

### March 15, 2026
- Refined dashboard layout and stabilized Vite/dev server environments.
- Integrated gender filtering and categorization for prompts.

## Project Repo
GitHub: [https://github.com/FateFumbler/toabh_image_generator](https://github.com/FateFumbler/toabh_image_generator)
