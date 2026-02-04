extends Area2D

signal clicked(petal_id)

@onready var polygon = $Polygon2D
@onready var collision = $CollisionPolygon2D

var id: String
var angle: float
var base_color: Color
var is_active: bool = false
var is_odd: bool = false

var original_rotation: float

func setup(p_id: String, p_angle: float, p_color: Color, p_size: float, p_radius: float, p_is_odd: bool):
	id = p_id
	angle = p_angle
	base_color = p_color
	is_odd = p_is_odd
	
	# Position and rotate the wrapper
	rotation_degrees = angle
	position = Vector2.DOWN.rotated(rotation) * -p_radius # Move away from center
	
	original_rotation = rotation_degrees
	
	# Setup visual shape
	# We want a leaf/petal shape. We'll approximate the "squircle" with a polygon.
	# The React code used borderRadius: '12% 100% 100% 100%' and rotate(45deg)
	var points = PackedVector2Array()
	var detail = 16
	# Center of the petal is (0, 0) in local space for rotation
	# But in React it was origin-bottom. 
	# Let's make (0,0) the bottom tip for easier radial layout.
	
	# Custom petal shape:
	# Bottom tip at (0,0)
	# Top point at (0, -size)
	# Wide in the middle
	points.append(Vector2(0, 0)) # Bottom tip
	
	# Left curve
	for i in range(1, detail):
		var t = float(i) / detail
		var x = -sin(t * PI) * (p_size * 0.4)
		var y = -t * p_size
		points.append(Vector2(x, y))
		
	points.append(Vector2(0, -p_size)) # Top tip
	
	# Right curve
	for i in range(detail - 1, 0, -1):
		var t = float(i) / detail
		var x = sin(t * PI) * (p_size * 0.4)
		var y = -t * p_size
		points.append(Vector2(x, y))
	
	polygon.polygon = points
	polygon.color = base_color
	collision.polygon = points
	
	# Add a slight gradient/shading effect if possible
	# For now, solid color with a bit of brightness variation for odd petal
	if is_odd:
		# In React, the odd color was passed in.
		pass

func _on_mouse_entered():
	if not is_active: return
	
	# Hover sound mapped to angle
	var pitch = 1.0 + 0.3 * sin(deg_to_rad(angle))
	SoundManager.play("PETAL_HOVER", 0.12, pitch)
	
	# Hover animation (GSAP wobble)
	var tween = create_tween()
	var offset = GameLogic.ANIMATION_CONFIG.WOBBLE.ROTATION_OFFSET * 0.4
	tween.tween_property(self, "rotation_degrees", original_rotation + offset, GameLogic.ANIMATION_CONFIG.WOBBLE.DURATION)
	tween.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(self, "rotation_degrees", original_rotation, GameLogic.ANIMATION_CONFIG.WOBBLE.DURATION)

func _input_event(_viewport, event, _shape_idx):
	if not is_active: return
	
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		SoundManager.play("PETAL_CLICK", 0.6)
		clicked.emit(id)

func bloom(delay: float):
	scale = Vector2.ZERO
	modulate.a = 0
	var tween = create_tween()
	tween.set_parallel(true)
	tween.tween_property(self, "scale", Vector2.ONE, GameLogic.ANIMATION_CONFIG.BLOOM.DURATION)\
		.set_delay(delay).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tween.tween_property(self, "modulate:a", 1.0, GameLogic.ANIMATION_CONFIG.BLOOM.DURATION)\
		.set_delay(delay)
	
	# Connect to a signal or timer for the pop sound
	get_tree().create_timer(delay).timeout.connect(func(): SoundManager.play("PETAL_POP", 0.2, randf_range(0.8, 1.2)))

func scatter():
	is_active = false
	var dir = Vector2.UP.rotated(randf_range(0, TAU))
	var force = randf_range(GameLogic.ANIMATION_CONFIG.SCATTER.FORCE_RANGE[0], GameLogic.ANIMATION_CONFIG.SCATTER.FORCE_RANGE[1])
	var rot = randf_range(GameLogic.ANIMATION_CONFIG.SCATTER.ROTATION_RANGE[0], GameLogic.ANIMATION_CONFIG.SCATTER.ROTATION_RANGE[1])
	
	var tween = create_tween()
	tween.set_parallel(true)
	var target_pos = position + dir * force + Vector2.DOWN * GameLogic.ANIMATION_CONFIG.SCATTER.GRAVITY
	tween.tween_property(self, "position", target_pos, GameLogic.ANIMATION_CONFIG.SCATTER.MIN_DURATION + randf())\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(self, "rotation_degrees", rotation_degrees + rot, GameLogic.ANIMATION_CONFIG.SCATTER.MIN_DURATION + randf())
	tween.tween_property(self, "modulate:a", 0.0, GameLogic.ANIMATION_CONFIG.SCATTER.MIN_DURATION + randf())
	tween.finished.connect(queue_free)

func wobble_suspense():
	var tween = create_tween()
	var offset = GameLogic.ANIMATION_CONFIG.WOBBLE.ROTATION_OFFSET
	for i in range(GameLogic.ANIMATION_CONFIG.WOBBLE.REPEATS):
		tween.tween_property(self, "rotation_degrees", original_rotation - offset, GameLogic.ANIMATION_CONFIG.WOBBLE.DURATION)
		tween.tween_property(self, "rotation_degrees", original_rotation + offset, GameLogic.ANIMATION_CONFIG.WOBBLE.DURATION)
	tween.tween_property(self, "rotation_degrees", original_rotation, GameLogic.ANIMATION_CONFIG.WOBBLE.RETURN_DURATION)\
		.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
