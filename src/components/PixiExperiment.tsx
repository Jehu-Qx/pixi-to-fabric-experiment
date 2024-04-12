import React, { useRef, useState } from "react";
import { Application, Sprite } from "pixi.js";
import { fabric } from "fabric";

export const PixiExperiment: React.FC = () => {
  const pixiCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<HTMLCanvasElement>(null);
  const [conversionComplete, setConversionComplete] = useState<boolean>(true);
  const imageData = useRef<Uint8ClampedArray | null>(null);
  const canvasW = useRef<number | null>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadedImage = await readFileAsDataURL(file);
    ImageToPixi(uploadedImage);
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const ImageToPixi = async (image: string) => {
    const app = new Application({
      antialias: true,
      backgroundColor: "#FFFFFF",
      width: 500,
      height: 500,
      view: pixiCanvasRef.current!,
    });

    const img = Sprite.from(image);

    img.texture.baseTexture.once("loaded", () => {
      const canvas = app.renderer.extract.canvas(img);
      const imgData = canvas
        .getContext("2d")
        ?.getImageData(0, 0, canvas.width, canvas.height);
      if (!imgData) {
        console.error("Failed to get image data");
        return;
      }

      img.anchor.set(0.5);
      const canvasWidth = app.screen.width;
      const canvasHeight = app.screen.height;
      const scale =
        Math.min(canvasWidth / img.width, canvasHeight / img.height) * 0.8;
      img.scale.set(scale);

      img.x = canvasWidth / 2;
      img.y = canvasHeight / 2;

      app.stage.addChild(img);

      imageData.current = imgData.data;
      canvasW.current = canvas.width;
      setConversionComplete(false); // Set conversion status to true
    });
  };

  const handleConvertButtonClick = () => {
    if (!imageData.current || !canvasW.current) {
      console.error("Image data or canvas width is not available.");
      return;
    }
    if (
      fabricCanvasRef.current &&
      fabricCanvasRef.current.childNodes.length > 0
    ) {
      console.error("There is already a rendered image.");
      return;
    }
    console.log("button triggered");
    RenderFabricCanvas(imageData.current, canvasW.current);
  };

  const RenderFabricCanvas = async (
    pixelData: Uint8ClampedArray,
    width: number
  ) => {
    return new Promise<void>((resolve, reject) => {
      const paddedLength =
        Math.ceil(pixelData.length / (4 * width)) * (4 * width);
      const paddedData = new Uint8ClampedArray(paddedLength);
      paddedData.set(pixelData);

      const imgData = new ImageData(
        paddedData,
        width,
        paddedLength / (4 * width)
      );

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = paddedLength / (4 * width);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }
      ctx.putImageData(imgData, 0, 0);

      const dataURL = canvas.toDataURL();

      fabric.Image.fromURL(dataURL, (fabricImage) => {
        fabricImage.set({ left: 0, top: 0 });

        const scaleFactor = Math.min(
          450 / fabricImage.width!,
          450 / fabricImage.height!
        );
        fabricImage.scaleX = scaleFactor;
        fabricImage.scaleY = scaleFactor;

        const fabricCanvas = new fabric.Canvas(fabricCanvasRef.current!);
        fabricCanvas.add(fabricImage);
        fabricCanvas.centerObject(fabricImage);
        fabricCanvas.renderAll();

        resolve();
        setConversionComplete(true); // Set conversion status to true
      });
    });
  };

  return (
    <div>
      <label htmlFor="file">Upload PNG:</label>
      <input type="file" id="file" onChange={handleFileUpload} />
      <div style={{ display: "flex", flexDirection: "row" }}>
        <div style={{ margin: 10 }}>
          <p>This is a pixi canvas</p>
          <div style={{ backgroundColor: "#FFFFFF" }}>
            <canvas ref={pixiCanvasRef} width={500} height={500} />
          </div>
        </div>
        <div style={{ margin: 10 }}>
          <p>This is a fabric canvas</p>
          <div style={{ backgroundColor: "#FFFFFF" }}>
            <canvas ref={fabricCanvasRef} width={500} height={500} />
          </div>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <button onClick={handleConvertButtonClick} disabled={!imageData.current || conversionComplete}>
          Convert
        </button>
      </div>
    </div>
  );
};
