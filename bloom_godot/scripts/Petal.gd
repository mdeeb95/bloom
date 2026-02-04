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
	
	# SETUP SQUIRCLE/TEARDROP SHAPE
	var points = PackedVector2Array()
	var detail = 32
	var side = p_size
	
	var r_sharp = side * 0.12
	var r_round = side * 0.44 # Scale down to ensure they don't meet in the middle
	
	# Bottom-Right (rounded)
	for i in range(detail / 4 + 1):
		var phi = lerp(PI/2.0, 0.0, float(i) / (detail/4))
		points.append(Vector2(side - r_round + cos(phi)*r_round, side - r_round + sin(phi)*r_round))
		
	# Top-Right (rounded)
	for i in range(detail / 4 + 1):
		var phi = lerp(0.0, -PI/2.0, float(i) / (detail/4))
		points.append(Vector2(side - r_round + cos(phi)*r_round, r_round + sin(phi)*r_round))

	# Top-Left (rounded)
	for i in range(detail / 4 + 1):
		var phi = lerp(-PI/2.0, -PI, float(i) / (detail/4))
		points.append(Vector2(r_round + cos(phi)*r_round, r_round + sin(phi)*r_round))

	# Bottom-Left (sharp-ish)
	for i in range(detail / 4 + 1):
		var phi = lerp(PI, PI/2.0, float(i) / (detail/4))
		points.append(Vector2(r_sharp + cos(phi)*r_sharp, side - r_sharp + sin(phi)*r_sharp))

	# Clean up duplicate points
	var cleaned_points = PackedVector2Array()
	if points.size() > 0:
		cleaned_points.append(points[0])
		for i in range(1, points.size()):
			if points[i].distance_to(points[i-1]) > 0.01:
				cleaned_points.append(points[i])
		# Ensure last point doesn't duplicate first
		if cleaned_points.size() > 1 and cleaned_points[-1].distance_to(cleaned_points[0]) < 0.01:
			cleaned_points.remove_at(cleaned_points.size() - 1)
	points = cleaned_points

	var offset = Vector2(-side * 0.75, -side * 0.25)
	for i in range(points.size()):
		points[i] += offset
		points[i] = points[i].rotated(deg_to_rad(135))
	
	# Fancy Shadow (multi-layer for softness)
	for i in range(3):
		var shadow = Polygon2D.new()
		add_child(shadow)
		move_child(shadow, 0)
		shadow.polygon = points
		# Decreasing opacity and increasing offset for softness
		var alpha = 0.08 - (i * 0.02)
		shadow.color = Color(0, 0, 0, alpha)
		shadow.position = Vector2(0, side * (0.04 + i * 0.04))
	
	polygon.polygon = points
	polygon.color = base_color
	collision.polygon = points
	
	# Shading (overlay gradient)
	var shading = Polygon2D.new()
	add_child(shading)
	shading.polygon = points
	shading.color = Color.BLACK
	shading.modulate.a = 0.1
	shading.vertex_colors = PackedColorArray()
	for p in points:
		var d = clamp(-p.y / (side * 1.5), 0.0, 1.0)
		shading.vertex_colors.append(Color(1, 1, 1, 1.0 - d))

	# Outline (on top)
	var line = Line2D.new()
	add_child(line)
	line.points = points
	line.closed = true
	line.width = 1.5
	line.default_color = Color(1, 1, 1, 0.15) # Faint white outline
	line.joint_mode = Line2D.LINE_JOINT_ROUND

func _on_mouse_entered():
	if not is_active: return
	var pitch = 1.3 + 0.3 * sin(deg_to_rad(angle))
	SoundManager.play("PETAL_HOVER", 0.12, pitch)
	var tween = create_tween()
	var offset = GameLogic.ANIMATION_CONFIG.WOBBLE.ROTATION_OFFSET * 0.4
	tween.tween_property(self, "rotation_degrees", original_rotation + offset, GameLogic.ANIMATION_CONFIG.WOBBLE.DURATION)
	tween.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(self, "rotation_degrees", original_rotation, GameLogic.ANIMATION_CONFIG.WOBBLE.DURATION)

func _input_event(_viewport, event, _shape_idx):
	if not is_active: return
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		get_viewport().set_input_as_handled()
		SoundManager.play("PETAL_CLICK", 0.6)
		clicked.emit(id)

func bloom(delay: float):
	print("Petal blooming with delay: ", delay)
	scale = Vector2.ZERO
	modulate.a = 0
	var tween = create_tween()
	tween.set_parallel(true)
	tween.tween_property(self, "scale", Vector2.ONE, GameLogic.ANIMATION_CONFIG.BLOOM.DURATION)\
		.set_delay(delay).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tween.tween_property(self, "modulate:a", 1.0, GameLogic.ANIMATION_CONFIG.BLOOM.DURATION)\
		.set_delay(delay)
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
