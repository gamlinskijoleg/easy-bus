import React, { useState, useRef, useEffect } from "react";
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

const App: React.FC = () => {
	const [model, setModel] = useState<TMImageModel | null>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [mainLabel, setMainLabel] = useState<string | null>(null);
	const [detectedDigits, setDetectedDigits] = useState<string | null>(null);
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

		ctx.filter = "grayscale(200%) contrast(200%) brightness(115%)";
		ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

		return canvas;
	};

	const predictImage = async () => {
		setMainLabel("");
		setDetectedDigits("");

		const fileInput = fileInputRef.current;
		if (!fileInput || !fileInput.files?.length || !model) return;

		const file = fileInput.files[0];
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
					.filter((symbol) => /\d/.test(symbol.text) && symbol.confidence > 85)
					.map((symbol) => symbol.text)
					.join("");

				setDetectedDigits(digits || null);
			};
		};

		reader.readAsDataURL(file);
	};

	return (
		<div className="App">
			<div id="logo">
				Easy <span>Bus</span>
			</div>

			<div id="image-container">{preview && <img id="image" src={preview} alt="Передбачення" />}</div>

			<div id="file-input-container">
				<label htmlFor="file-input">Scan transport!</label>
				<input id="file-input" type="file" accept="image/*" ref={fileInputRef} onChange={predictImage} />
			</div>
			<div id="label-container">
				{mainLabel && (
					<>
						<p id="transport-type">{mainLabel}</p>
						<p id="numbers">Номер: {detectedDigits ?? "нічого не знайдено."}</p>
					</>
				)}
			</div>
		</div>
	);
};

export default App;
