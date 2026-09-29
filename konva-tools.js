// 检测是否是移动触摸设备
const _isMobileDevice_ = (function() {
	try {
		const touchable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		const userAgent = navigator.userAgent || navigator.vendor || window.opera;
		const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
		return isMobile && touchable;
	} catch(e) {
		console.error('>> Failed to test touchable mobile device.');
		return false;
	}
})();
	
class KonvaImage extends Konva.Image {
	/**
	 * last size
	 * @type {{width: number, height: number}}
	 */
	_lastSize;
	/**
	 * last crop
	 * @type {{x: number, y: number, width: number, height: number}}
	 */
	_lastCrop;

	constructor(imageData) {
		super(imageData);
		this.draggable(imageData.draggable || false);
		this.cropWidth(imageData.image.width);
		this.cropHeight(imageData.image.height);
		this._lastCrop = this.crop();
	}
	/**
	 * before transform
	 */
	handleTransformStart() {
		this._lastSize = this.size();
		this._lastCrop = this.crop();
	}
	/**
	 * transforming
	 * @param {string} activeAnchor
	 */
	handleTransform(activeAnchor) {
		this.setAttrs({
			scaleX: 1,
			scaleY: 1,
			width: this.width() * this.scaleX(),
			height: this.height() * this.scaleY()
		});
		this.handleCrop(this.size(), this._lastSize, this._lastCrop, activeAnchor);
	}
	/**
	 * after transform
	 */
	handleTransformEnd() {
		this._lastSize = null;
		this._lastCrop = null;
	}
	/**
	 * keep ratio when scaling
	 * @param {typeof this._lastSize} curSize
	 * @param {typeof this._lastSize} lastSize
	 * @param {typeof this._lastCrop} lastCrop
	 * @param {string} anchor
	 */
	handleCrop(curSize, lastSize, lastCrop, anchor) {
		const image = this.image();

		if (anchor === "middle-left" || anchor === "middle-right") {
			// 左右拖动 → 始终使用宽度比例（关键修复）
			const ratio = curSize.width / lastSize.width;
			let newCropWidth = lastCrop.width * ratio;

			this.cropWidth(newCropWidth);

			if (anchor === "middle-left") {
				// 左侧拖动时固定右侧边缘（向内/向外都适用）
				this.cropX(lastCrop.x + lastCrop.width - newCropWidth);
			}
			// middle-right 不需要改 cropX（固定左侧边缘）

		} 
		else if (anchor === "top-center" || anchor === "bottom-center") {
			// 上下拖动 → 始终使用高度比例
			const ratio = curSize.height / lastSize.height;
			let newCropHeight = lastCrop.height * ratio;

			this.cropHeight(newCropHeight);

			if (anchor === "top-center") {
				// 顶部拖动时固定底部边缘（向内/向外都适用）
				this.cropY(lastCrop.y + lastCrop.height - newCropHeight);
			}
			// bottom-center 不需要改 cropY（固定顶部边缘）
		}

		// 【安全兜底】防止 crop 超出图片边界（避免黑边或报错）
		let crop = this.crop();
		const w = image.width;
		const h = image.height;

		crop.x = Math.max(0, Math.min(crop.x, w - 1));
		crop.y = Math.max(0, Math.min(crop.y, h - 1));
		crop.width = Math.max(1, Math.min(crop.width, w - crop.x));
		crop.height = Math.max(1, Math.min(crop.height, h - crop.y));

		this.crop(crop);
	}
}


/**
 * custom style transformer
 */
class ScaleTransformer extends Konva.Transformer {
	constructor(config) {
		super({
			...config,
			flipEnabled: false,
            rotateAnchorOffset: (_isMobileDevice_ ? 60 : 40),
			rotateAnchorPosition: _isMobileDevice_ ? 'bottom' : 'top',
            rotationSnaps: [], //[0, 45, 90, 135, 180, 225, 270, 315]
            rotationSnapTolerance: 2, //default: 5
			padding: 0,
			anchorStrokeWidth: 1,
            borderStrokeWidth: 1,
			anchorStyleFunc: (anchor) => {
				const padding = this.padding();
				const defCornerRadius = 10;
				//const rotateAnchorPosition = this.rotateAnchorPosition();

				if (anchor.hasName("top-center") || anchor.hasName("bottom-center")) {
					const w = _isMobileDevice_ ? 40 : 26,
						h = _isMobileDevice_ ? 14 : 6;
					anchor.setAttrs({
						cornerRadius: defCornerRadius,
						width: w,
						offsetX: w/2,
						height: h,
						offsetY: (h/2 + (anchor.hasName("top-center") ? padding : -padding))
					});
				} 
				else if (anchor.hasName("middle-left") || anchor.hasName("middle-right")) {
					const h = _isMobileDevice_ ? 40 : 26,
						w = _isMobileDevice_ ? 14 : 6;
					anchor.setAttrs({
						cornerRadius: defCornerRadius,
						height: h,
						offsetY: h/2,
						width: w,
						offsetX: (w/2 + (anchor.hasName("middle-left") ? padding : -padding))
					});
				} 
				else if (anchor.hasName("rotater")) {
					const wh = _isMobileDevice_ ? 32 : 20;

					const anchorImgGroup = new Konva.Group();
					anchorImgGroup.add(new Konva.Rect({width: wh, height: wh, fill: 'white'}));
					anchorImgGroup.add(new Konva.Path({
						scaleX: wh/24,
						scaleY: wh/24,
						data: "M4.983 11a1 1 0 0 1 1.008.867l.009.116.003.224a6 6 0 0 0 6.554 5.768l-.264-.268a1 1 0 0 1 1.414-1.414l2 2a1 1 0 0 1 0 1.414l-2 2a1 1 0 0 1-1.414-1.414l.318-.316A8.1 8.1 0 0 1 12 20c-4.231 0-7.711-3.29-7.983-7.49l-.013-.252L4 12.017A1 1 0 0 1 4.983 11zm6.724-8.707a1 1 0 0 1 .083 1.32l-.083.094-.318.316A8 8 0 0 1 20 12a1 1 0 0 1-1.999 0 6 6 0 0 0-6.557-5.975l.264.268a1 1 0 0 1-1.32 1.497l-.094-.083-2-2a1 1 0 0 1-.083-1.32l.083-.094 2-2a1 1 0 0 1 1.414 0z",
            			fill: "black"
					}));
					const anchorImg = anchorImgGroup.toCanvas({
						pixelRatio: 2,
						width: wh,
						height: wh
					});

					anchor.setAttrs({
						width: wh,
						height: wh,
						cornerRadius: wh/2,
						offsetX: wh/2,
                    	offsetY: wh/2,
						fillPatternImage: anchorImg,
						fillPatternScaleX: 0.5,
						fillPatternScaleY: 0.5,
						fillPriority: 'pattern',
						fillPatternRepeat: "no-repeat"
					});
				} 
				else {
					// 四个角的圆形
					const wh = _isMobileDevice_ ? 20 : 14;
					const ox = wh/2 + (anchor.hasName("top-left") || anchor.hasName("bottom-left") ? padding : -padding);
					const oy = wh/2 + (anchor.hasName("top-left") || anchor.hasName("top-right") ? padding : -padding);
					anchor.setAttrs({
						cornerRadius: defCornerRadius,
						width: wh,
						height: wh,
						offsetX: ox,
						offsetY: oy
					});
				}
			}
		});
	}
}

class BaseScene extends Konva.Group {
	static sceneId = "BaseScene";
	/**
	 * @type {Konva.Stage}
	 */
	_stage;
	/**
	 * @type {SceneManager}
	 */
	_sceneManager;
	/**
	 * @type {Konva.Transformer}
	 */
	_scaleTransformer;

	constructor(stage, sceneManager) {
		super();
		this._stage = stage;
		this._sceneManager = sceneManager;
		this._scaleTransformer = new ScaleTransformer();
		this.add(this._scaleTransformer);
		this._handlePointerDown = this._handlePointerDown.bind(this);
		this._handleDoubleClick = this._handleDoubleClick.bind(this);
		this._handleTransformStart = this._handleTransformStart.bind(this);
	}
	_registerEvents() {
		this._stage.on("pointerdown", this._handlePointerDown);
		this._stage.on("pointerdblclick", this._handleDoubleClick);
		this._scaleTransformer.on("transformstart", this._handleTransformStart);
	}
	_unbindEvents() {
		this._stage.off("pointerdown", this._handlePointerDown);
		this._stage.off("pointerdblclick", this._handleDoubleClick);
		this._scaleTransformer.off("transformstart", this._handleTransformStart);
	}
	_handlePointerDown({ target }) {
		if (target.hasName("_anchor")) {
			return;
		}
		if (target.className === "Image") {
			const isSelected = this.getSelection() === target;
			if (isSelected) {
				return;
			}
			this.setSelection([target]);
		} else {
			this.setSelection([]);
		}
	}
	_handleDoubleClick(e) {
		const selection = this.getSelection();
		if (e.target === selection) {
			if (selection.className === "Image") {
				this._sceneManager.goto(CropScene);
			}
		}
	}
	_handleTransformStart() {
		const selection = this.getSelection();
		if (selection === null) {
			return;
		}
		const activeAnchor = this._scaleTransformer.getActiveAnchor();
		selection.handleTransformStart(activeAnchor);

		const transformHandler = () => {
			selection.handleTransform(activeAnchor);
		};

		const transformEndHandler = () => {
			this._scaleTransformer.off("transform", transformHandler);
			this._scaleTransformer.off("transformend", transformEndHandler);
			selection.handleTransformEnd(activeAnchor);
		};

		this._scaleTransformer.on("transform", transformHandler);
		this._scaleTransformer.on("transformend", transformEndHandler);
	}

	hide() {
		super.hide();
		this._unbindEvents();
	}

	show() {
		super.show();
		this._registerEvents();
	}

	getSelection() {
		return this._scaleTransformer.nodes()[0] ?? null;
	}

	setSelection(target) {
		this._scaleTransformer.nodes(target);
	}
}


class CropScene extends Konva.Group {
	static sceneId = "CropScene";
	/**
	 * transformer for crop
	 * @type {Konva.Transformer}
	 */
	_cropTransformer;
	/**
	 * transformer for scale
	 * @type {Konva.Transformer}
	 */
	_scaleTransformer;
	/**
	 * canvas mask
	 * @type {Konva.Rect}
	 */
	_mask;
	/**
	 * image without crop
	 * @type {Konva.Image}
	 */
	_originImage;
	/**
	 * @type {Konva.Group}
	 */
	_cropGroup;
	/**
	 * for clipping the image('Konva.Image' doesn't have the property 'clip')
	 * @type {Konva.Group}
	 */
	_clipGroup;
	/**
	 * highlight image
	 * @type {Konva.Image}
	 */
	_clipImage;
	/**
	 * the cropped area of the image
	 * @type {Konva.Rect}
	 */
	_clipRect;
	/**
	 * grid line
	 * @type {Konva.Group}
	 */
	_grid;
	/**
	 * @type {Konva.Stage}
	 */
	_stage;
	/**
	 * @type {SceneManager}
	 */
	_sceneManager;

	constructor(stage, sceneManager) {
		super();
		this._stage = stage;
		this._sceneManager = sceneManager;
		this._createMask();
		this._createTransformer();
		this._handlePointerDown = this._handlePointerDown.bind(this);
		this._handleCrop = this._handleCrop.bind(this);
		this._handleScale = this._handleScale.bind(this);
		this._handleDrag = this._handleDrag.bind(this);
	}
	/**
	 * bind events
	 */
	_registerEvents() {
		this._stage.on("pointerdown", this._handlePointerDown);
		this._cropTransformer.on("dragmove", this._handleDrag);
		this._cropTransformer.on("transform", this._handleCrop);
		this._originImage.on("transform", this._handleScale);
	}
	/**
	 * unbind events
	 */
	_unbindEvents() {
		this._stage.off("pointerdown", this._handlePointerDown);
		this._cropTransformer.off("dragmove", this._handleDrag);
		this._cropTransformer.off("transform", this._handleCrop);
		this._originImage.off("transform", this._handleScale);
	}
	/**
	 * scale
	 */
	_handleScale() {
		const originImage = this._originImage;

		const scaleX = originImage.scaleX();
		const scaleY = originImage.scaleY();
		const width = originImage.width() * scaleX;
		const height = originImage.height() * scaleY;

		const rectAbspos = this._clipRect.absolutePosition();
		const imageAbsPos = this._cropGroup.absolutePosition();

		this._cropGroup.absolutePosition(originImage.absolutePosition());
		// should not change the position of the 'clipRect'
		this._clipRect.absolutePosition(rectAbspos);
		// scale limit
		if (
			this._clipRect.x() <= 0 ||
			this._clipRect.y() <= 0 ||
			this._clipRect.x() + this._clipRect.width() >= width ||
			this._clipRect.y() + this._clipRect.height() >= height
		) {
			this._cropGroup.absolutePosition(imageAbsPos);
			this._clipRect.absolutePosition(rectAbspos);
			this._originImage.setAttrs({
				width: this._clipImage.width(),
				height: this._clipImage.height(),
				scaleX: 1,
				scaleY: 1,
				absolutePosition: imageAbsPos
			});
		} else {
			originImage.setAttrs({
				scaleX: 1,
				scaleY: 1,
				width: width,
				height: height
			});
			this._clipImage.setAttrs({
				width: width,
				height: height
			});
		}
		const x = this._clipRect.x();
		const y = this._clipRect.y();
		this._clipGroup.clipX(x);
		this._clipGroup.clipY(y);
		this._grid.position({ x, y });
	}
	/**
	 * move
	 */
	_handleDrag() {
		let x = this._clipRect.x();
		let y = this._clipRect.y();
		let width = this._clipRect.width();
		let height = this._clipRect.height();
		const originWidth = this._originImage.width();
		const originHeight = this._originImage.height();

		if (x < 0) {
			x = 0;
		}
		if (x + width > originWidth) {
			x = originWidth - width;
			width = originWidth - x;
		}
		if (y < 0) {
			y = 0;
		}
		if (y + height > originHeight) {
			y = originHeight - height;
			height = originHeight - y;
		}

		this._clipRect.setAttrs({
			x: x,
			y: y,
			width: width,
			height: height
		});
		this._clipGroup.clip({
			x: x,
			y: y,
			width: width,
			height: height
		});
		this._grid.position({ x: x, y: y });
		this._drawGridLine(width, height);
	}
	/**
	 * crop
	 */
	_handleCrop() {
		let x = this._clipRect.x();
		let y = this._clipRect.y();
		let width = this._clipRect.width() * this._clipRect.scaleX();
		let height = this._clipRect.height() * this._clipRect.scaleY();
		if (x < 0) {
			width += x;
			x = 0;
		}
		if (x + width > this._originImage.width()) {
			width = this._originImage.width() - x;
		}
		if (y < 0) {
			height += y;
			y = 0;
		}
		if (y + height > this._originImage.height()) {
			height = this._originImage.height() - y;
		}
		this._clipRect.setAttrs({
			x: x,
			y: y,
			width: width,
			height: height,
			scaleX: 1,
			scaleY: 1
		});
		this._cropTransformer.absolutePosition(this._clipRect.absolutePosition());
		this._clipGroup.clip({
			x: x,
			y: y,
			width: width,
			height: height
		});
		this._grid.position({ x: x, y: y });
		this._drawGridLine(width, height);
	}
	/**
	 * update the image we selected
	 * @private
	 */
	_handleCropEnd() {
		const selectedImage = this._sceneManager.getScene(BaseScene).getSelection();
		const image = selectedImage.image(); // dom img
		const ratio = this._originImage.width() / image.width;
		const cropX = this._clipRect.x() / ratio;
		const cropY = this._clipRect.y() / ratio;
		const width = this._clipRect.width();
		const height = this._clipRect.height();
		const cropWidth = (width * image.width) / this._originImage.width();
		const cropHeight = (height * image.height) / this._originImage.height();
		selectedImage.setAttrs({
			width: width,
			height: height,
			cropX: cropX,
			cropY: cropY,
			cropWidth: cropWidth,
			cropHeight: cropHeight
		});
		selectedImage.absolutePosition(this._clipRect.absolutePosition());
	}
	/**
	 * draw the grid line
	 * @param {number} width
	 * @param {number} height
	 */
	_drawGridLine(width, height) {
		this._grid.destroyChildren();
		const stepX = width / 3;
		const stepY = height / 3;
		for (let i = 1; i <= 2; i++) {
			const vLine = new Konva.Line({
				points: [stepX * i, 0, stepX * i, height],
				stroke: "#ffffff",
				strokeWidth: 1
			});
			const hLine = new Konva.Line({
				points: [0, stepY * i, width, stepY * i],
				stroke: "#ffffff",
				strokeWidth: 1
			});
			this._grid.add(vLine, hLine);
		}
	}
	/**
	 * @param {*} e
	 */
	_handlePointerDown(e) {
		const target = e.target;
		if (target.hasName("mask")) {
			this._handleCropEnd();
			this._sceneManager.goto(BaseScene);
		}
	}
	_createMask() {
		const rect = new Konva.Rect({
			width: this._stage.width(),
			height: this._stage.height(),
			fill: "rgba(0, 0, 0, 0.5)"
		});
		rect.addName("mask");
		this._mask = rect;
		this.add(rect);
	}
	_createTransformer() {
		this._cropTransformer = new Konva.Transformer({
			flipEnabled: false,
			keepRatio: false,
			rotateEnabled: false,
			enabledAnchors: ["top-left", "top-right", "bottom-left", "bottom-right"]
		});
		this._scaleTransformer = new ScaleTransformer({
			flipEnabled: false,
			rotateEnabled: false,
			enabledAnchors: ["top-left", "top-right", "bottom-left", "bottom-right"]
		});
		this.add(this._cropTransformer, this._scaleTransformer);
	}

	show() {
		this.visible(true);
		const selectedImage = this._sceneManager.getScene(BaseScene).getSelection();
		const abspos = selectedImage.absolutePosition();
		const ratio = selectedImage.width() / selectedImage.cropWidth();

		const originWidth = ratio * selectedImage.image().width;
		const originHeight = ratio * selectedImage.image().height;
		const cropX = selectedImage.cropX() * ratio;
		const cropY = selectedImage.cropY() * ratio;

		this._originImage = selectedImage.clone({
			cropX: 0,
			cropY: 0,
			cropWidth: 0,
			cropHeight: 0,
			width: originWidth,
			height: originHeight,
			draggable: false
		});

		this._cropGroup = new Konva.Group({
			rotation: selectedImage.rotation(),
			draggable: false,
			absolutePosition: {
				x: abspos.x,
				y: abspos.y
			},
		});

		this._clipRect = new Konva.Rect({
			width: selectedImage.width(),
			height: selectedImage.height(),
			draggable: true
		});

		this._clipGroup = new Konva.Group();
		this._clipImage = this._originImage.clone({
			x: 0,
			y: 0,
			rotation: 0
		});
		this._clipGroup.add(this._clipImage);

		this._grid = new Konva.Group();
		this._cropGroup.add(this._clipGroup, this._clipRect, this._grid);

		selectedImage.hide();

		this.add(this._originImage, this._cropGroup);
		// adjust position
		this._clipRect.position({ x: -cropX, y: -cropY });
		const pos = this._clipRect.absolutePosition();
		this._originImage.absolutePosition({ ...pos });
		this._cropGroup.absolutePosition({ ...pos });
		this._clipRect.position({ x: cropX, y: cropY });

		this._handleCrop();
		this._cropTransformer.nodes([this._clipRect]);
		this._scaleTransformer.nodes([this._originImage]);
		this._cropTransformer.zIndex(4);
		this._mask.zIndex(2);
		this._scaleTransformer.zIndex(3);
		this._registerEvents();
	}

	hide() {
		this._unbindEvents();
		this.visible(false);
		this._originImage.destroy();
		this._cropGroup.destroy();
		this._originImage = null;
		this._cropGroup = null;
		this._clipGroup = null;
		this._clipImage = null;
		this._clipRect = null;
		this._grid = null;
		this._cropTransformer.nodes([]);
		this._scaleTransformer.nodes([]);
		const selectedImage = this._sceneManager.getScene(BaseScene).getSelection();
		selectedImage.show();
	}
}


class SceneManager extends Konva.Group {
	/**
	 * @type {Konva.Stage}
	 */
	_stage;
	/**
	 * @type {{new (stage): Konva.Group; hide: () => void; show: () => void; sceneId: string}}
	 */
	_currentScene;

	constructor(stage) {
		super();
		this._stage = stage;
	}
	/**
	 * get scene
	 * @param {typeof this._currentScene} SceneCtor
	 */
	getScene(SceneCtor) {
		const scene = this.children.find(
			(scene) => scene.constructor.sceneId === SceneCtor.sceneId
		);
		if (!scene) {
			throw new Error("No such scene!");
		}
		return scene;
	}
	/**
	 * @param {typeof this._currentScene} SceneCtor
	 */
	hasScene(SceneCtor) {
		return (
			this.children.findIndex(
				(scene) => scene.constructor.sceneId === SceneCtor.sceneId
			) !== -1
		);
	}
	/**
	 * change scene
	 * @param {typeof this._currentScene} SceneCtor
	 */
	goto(SceneCtor) {
		if (this._currentScene?.constructor.sceneId === SceneCtor.sceneId) {
			return;
		}
		let scene;
		if (this.hasScene(SceneCtor)) {
			scene = this.getScene(SceneCtor);
		} else {
			scene = new SceneCtor(this._stage, this);
			this.add(scene);
		}
		this._currentScene?.hide();
		this._currentScene = scene;
		scene.show();
	}
}

