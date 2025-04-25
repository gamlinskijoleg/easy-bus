import React, { useState, useRef, useEffect, memo } from "react";
import "./App.css";

declare const Tesseract: {
	recognize: (image: HTMLCanvasElement | string, lang: string) => Promise<TesseractResult>;
};

declare const tmImage: {
	load: (modelUrl: string, metadataUrl: string) => Promise<TMImageModel>;
};

const modelURL = "https://teachablemachine.withgoogle.com/models/Oem7Iweli/";

type TesseractSymbol = {
	text: string;
	confidence: number;
};

type TesseractResult = {
	data: {
		symbols: TesseractSymbol[];
	};
};

type TMImagePrediction = {
	className: string;
	probability: number;
};

type TMImageModel = {
	predict: (image: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) => Promise<TMImagePrediction[]>;
	getTotalClasses: () => number;
};

const BACKEND_URL = "http://127.0.0.1:8000";

const ImagePreview = memo(({ preview }: { preview: string | null }) => {
	return preview ? <img id="image" src={preview} alt="Передбачення" /> : null;
});

const LabelContainer = memo(({ mainLabel, detectedDigits }: { mainLabel: string | null; detectedDigits: string | null }) => {
	return mainLabel ? (
		<div id="label-container">
			<p id="transport-type">{mainLabel}</p>
			<p id="numbers">Номер: {detectedDigits ?? "нічого не знайдено."}</p>
		</div>
	) : null;
});

const DownloadLink = memo(({ downloadUrl }: { downloadUrl: string | null }) => {
	return downloadUrl ? (
		<div id="download-container">
			<a href={downloadUrl} download="cropped_image.png">
				Download Cropped Image
			</a>
		</div>
	) : null;
});

const App: React.FC = () => {
	const [model, setModel] = useState<TMImageModel | null>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [mainLabel, setMainLabel] = useState<string | null>(null);
	const [detectedDigits, setDetectedDigits] = useState<string | null>(null);
	const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const initModel = async () => {
			const loadedModel = await tmImage.load(`${modelURL}model.json`, `${modelURL}metadata.json`);
			setModel(loadedModel);
		};
		initModel();
	}, []);

	const preprocessImage = (image: HTMLImageElement) => {
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");

		if (!ctx) {
			throw new Error("Failed to get 2D context");
		}

		const targetWidth = 800;
		const aspectRatio = image.height / image.width;
		const targetHeight = targetWidth * aspectRatio;

		canvas.width = targetWidth;
		canvas.height = targetHeight;

		ctx.filter = "grayscale(100%) contrast(200%) brightness(115%)";
		ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

		return canvas;
	};

	const predictImage = async (event: any) => {
		console.log("predictImage function called");
		event.preventDefault();
		setMainLabel("");
		setDetectedDigits("");
		setDownloadUrl(null);

		// const fileInput = null
		const fileInput = fileInputRef.current;
		if (!fileInput || !model) {
			console.log("File input or model is missing"); // Debugging log
			return;
		}

		if (!fileInput.files?.length) {
			console.log("shit");

			return;
		}

		const file = fileInput.files[0];
		console.log("File selected:", file); // Debugging log

		const formData = new FormData();
		formData.append("file", file);
		event.preventDefault(); // Prevent default behavior

		const response = await fetch(`${BACKEND_URL}/process-image/`, {
			method: "POST",
			body: formData,
		});

		// const blob = await response.blob();
		// const imageUrl = URL.createObjectURL(blob);
		// setDownloadUrl(imageUrl);

		const reader = new FileReader();
		reader.onload = async () => {
			const imageSrc = reader.result as string;
			setPreview(imageSrc);

			const img = new Image();
			img.src = imageSrc;

			img.onload = async () => {
				const prediction = await model.predict(img);
				const labels = ["Це автобус.", "Це тролейбус.", "Це трамвай."];
				const maxIndex = prediction.map((p) => p.probability).indexOf(Math.max(...prediction.map((p) => p.probability)));

				setMainLabel(labels[maxIndex] || "Невідомий транспорт.");

				const preprocessedCanvas = preprocessImage(img);
				const result = await Tesseract.recognize(preprocessedCanvas, "eng");

				const digits = result.data.symbols
					.filter((symbol) => /\d/.test(symbol.text) && symbol.confidence > 95)
					.map((symbol) => symbol.text)
					.join("");

				setDetectedDigits(digits || null);
			};
		};

		// reader.readAsDataURL(file);
	};

	return (
		<div className="App">
			<div id="logo">
				Easy <span>Bus</span>
			</div>

			<div id="image-container">
				<ImagePreview preview={preview} />
			</div>

			<div id="file-input-container">
				<label htmlFor="file-input">Scan transport!</label>
				<input id="file-input" type="file" accept="image/*" ref={fileInputRef} onChange={predictImage} />
			</div>

			<LabelContainer mainLabel={mainLabel} detectedDigits={detectedDigits} />

			<DownloadLink downloadUrl={downloadUrl} />
		</div>
	);
};

export default App;
