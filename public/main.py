from fastapi import FastAPI, File, UploadFile
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io

app = FastAPI()

# Add CORS middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to restrict origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/process-image/")
async def process_image(file: UploadFile = File(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))

    # ТУТ: запускаєш YOLOv5 → отримуєш bbox
    # Наприклад:
    # bbox = [x, y, w, h]

    bbox = [100, 50, 120, 60]  # Для прикладу

    cropped = image.crop((bbox[0], bbox[1], bbox[0]+bbox[2], bbox[1]+bbox[3]))

    # Зберігаємо тимчасово файл
    cropped_path = "cropped_bus_line.png"
    cropped.save(cropped_path)

    return FileResponse(cropped_path, media_type="image/png", filename="bus_line.png")
