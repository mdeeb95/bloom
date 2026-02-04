extends Control

const RingScene = preload("res://scenes/Ring.tscn")

@onready var game_layer = $GameLayer
@onready var stem_container = $StemContainer
@onready var score_label = $UILayer/ScoreLabel
@onready var message_label = $UILayer/MessageLabel
@onready var start_screen = $UILayer/StartScreen
@onready var camera = $Camera2D

var level: int = 1
var rings: Array = []
var is_transitioning: bool = false
var game_active: bool = false

func _ready():
	randomize()
	# Ensure the UI covers the screen and elements are centered
	_on_size_changed()
	get_viewport().size_changed.connect(_on_size_changed)
	
	setup_background()
	init_visuals()

func setup_background():
	var bg_rect = get_node_or_null("BackgroundLayer/ColorRect")
	if not bg_rect:
		printerr("Could not find BackgroundLayer/ColorRect")
		return
	bg_rect.color = Color("#fafafa")
	
	# Create Orbs
	var orb_colors = [
		Color("#fecdd3", 0.4), # Rose
		Color("#c7d2fe", 0.3), # Indigo
		Color("#ccfbf1", 0.5), # Teal
		Color("#fef3c7", 0.3)  # Amber
	]
	
	for i in range(orb_colors.size()):
		var orb = TextureRect.new()
		bg_rect.add_child(orb)
		
		# Create a radial gradient texture for the orb
		var tex = GradientTexture2D.new()
		tex.fill = GradientTexture2D.FILL_RADIAL
		tex.fill_from = Vector2(0.5, 0.5)
		tex.fill_to = Vector2(1.0, 0.5)
		var grad = Gradient.new()
		grad.set_color(0, orb_colors[i])
		grad.set_color(1, Color(orb_colors[i], 0.0))
		tex.gradient = grad
		tex.width = 600
		tex.height = 600
		
		orb.texture = tex
		orb.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		orb.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		orb.size = Vector2(800, 800)
		
		# Initial random position
		orb.position = Vector2(randf_range(-200, 600), randf_range(-200, 800))
		
		# Animate orbs
		animate_orb(orb)

	# Add Noise Texture for grain
	var noise_rect = TextureRect.new()
	bg_rect.add_child(noise_rect)
	noise_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	noise_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	noise_rect.modulate.a = 0.03
	
	var noise_tex = NoiseTexture2D.new()
	noise_tex.width = 512
	noise_tex.height = 512
	noise_tex.seamless = true
	var noise = FastNoiseLite.new()
	noise.frequency = 0.5
	noise_tex.noise = noise
	noise_rect.texture = noise_tex
	noise_rect.stretch_mode = TextureRect.STRETCH_TILE

func animate_orb(orb: TextureRect):
	var tween = create_tween().set_loops()
	var start_pos = orb.position
	var duration = randf_range(20.0, 30.0)
	
	# Create a slow floating path
	tween.tween_property(orb, "position", start_pos + Vector2(randf_range(50, 150), randf_range(-150, -50)), duration / 3.0)\
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(orb, "position", start_pos + Vector2(randf_range(-100, 0), randf_range(50, 150)), duration / 3.0)\
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(orb, "position", start_pos, duration / 3.0)\
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

func _on_size_changed():
	var center = get_viewport_rect().size / 2.0
	game_layer.position = center
	stem_container.position = center
	if camera:
		camera.position = center

func init_visuals():
	clear_rings()
	# Reset scale
	game_layer.scale = Vector2.ONE
	
	# Spawn a first ring for the start screen
	var colors = GameLogic.generate_round_colors(1)
	var ring = RingScene.instantiate()
	game_layer.add_child(ring)
	var config = GameLogic.get_ring_config(1)
	ring.setup(0, config, colors)
	ring.set_active(false) # Not interactive yet
	rings.append(ring)
	ring.bloom()
	
	start_screen.show()
	score_label.hide()
	message_label.text = ""

func start_game():
	print("Starting game...")
	level = 1
	game_active = true
	is_transitioning = false
	
	# Fade out start screen
	var tween = create_tween()
	tween.tween_property(start_screen, "modulate:a", 0.0, 0.5)
	tween.finished.connect(func(): start_screen.hide(); start_screen.modulate.a = 1.0)
	
	# Sprout stem
	var center = get_viewport_rect().size / 2.0
	stem_container.position = center + Vector2(0, 300)
	var stem_tween = create_tween()
	stem_tween.tween_property(stem_container, "position", center, 0.8)\
		.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	
	message_label.text = ""
	score_label.show()
	update_ui()
	
	# Clear the preview ring and start properly
	clear_rings()
	# Wait for clearance to avoid race conditions with game_layer additions
	get_tree().process_frame.connect(spawn_level, CONNECT_ONE_SHOT)
	SoundManager.play("START_GAME")

func spawn_level():
	print("Spawning level: ", level)
	is_transitioning = true
	var colors = GameLogic.generate_round_colors(level)
	
	# Create only the NEW ring
	var ring = RingScene.instantiate()
	game_layer.add_child(ring)
	
	var ring_id = level - 1 # Use current level as index
	var config = GameLogic.get_ring_config(level)
	
	ring.setup(ring_id, config, colors)
	ring.petal_clicked.connect(_on_petal_clicked)
	rings.append(ring)
	
	# Update all rings' state and scaling
	update_rings_state()
	
	# Bloom the new ring
	ring.bloom()
	
	# Scale the flower container based on number of rings
	update_flower_scale()
	
	is_transitioning = false

func update_rings_state():
	for i in range(rings.size()):
		var is_current = (i == rings.size() - 1)
		rings[i].set_active(is_current)
		rings[i].update_scaling(i, rings.size())

func update_flower_scale():
	if rings.is_empty(): return
	
	# Get config for the current level (outermost ring)
	var config = GameLogic.get_ring_config(level)
	# Calculate maximum extent of the flower
	var max_extent = config.radius + config.petalSize * 1.5
	
	# Determine target zoom based on viewport size
	var viewport_size = get_viewport_rect().size
	var min_dim = min(viewport_size.x, viewport_size.y)
	# Aim to keep the flower within 90% of the screen height/width
	var target_zoom_val = (min_dim / 2.0 * 0.9) / max_extent
	
	# Clamp zoom to reasonable values
	target_zoom_val = clamp(target_zoom_val, 0.05, 2.5)
	
	var tween = create_tween()
	tween.set_parallel(true)
	var target_scale = Vector2.ONE / target_zoom_val
	
	if camera:
		tween.tween_property(camera, "zoom", Vector2(target_zoom_val, target_zoom_val), 1.0)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	else:
		tween.tween_property(game_layer, "scale", Vector2(target_zoom_val, target_zoom_val), 1.0)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	
	tween.tween_property(stem_container, "scale", target_scale, 1.0)\
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

func _on_petal_clicked(ring_id: int, petal_id: String):
	if is_transitioning or not game_active:
		return
		
	# Ring ID matches index in rings array
	var ring = rings[ring_id]
	var petal = ring.get_petal(petal_id)
	
	if petal.is_odd:
		handle_level_up()
	else:
		handle_game_over()

func handle_level_up():
	print("Level up!")
	is_transitioning = true
	SoundManager.play("LEVEL_UP")
	SoundManager.play_shepard("PETAL_POP", level)
	
	# Play a subtle bloom sound for new rings (matches web)
	if level > 1:
		SoundManager.play("START_GAME", 0.3)
	
	level += 1
	update_ui()
	
	# Wobble effect on ALL rings
	await suspense_wobble()
	
	# Small delay before spawning next
	await get_tree().create_timer(0.2).timeout
	spawn_level()

func handle_game_over():
	print("Game over!")
	game_active = false
	SoundManager.play("GAME_OVER")
	message_label.text = "Game Over\nClick to Restart"
	
	# Scatter effect
	for ring in rings:
		ring.scatter()
	rings.clear()

func suspense_wobble():
	var config = GameLogic.ANIMATION_CONFIG.WOBBLE
	
	for ring in rings:
		# Shake rotation
		var ring_tween = create_tween()
		for i in range(config.REPEATS):
			var offset = config.ROTATION_OFFSET if i % 2 == 0 else -config.ROTATION_OFFSET
			ring_tween.tween_property(ring, "rotation_degrees", ring.rotation_degrees + offset, config.DURATION).set_trans(Tween.TRANS_SINE)
		
		# Return to base
		ring_tween.tween_property(ring, "rotation_degrees", ring.rotation_offset, config.RETURN_DURATION).set_ease(Tween.EASE_OUT)
	
	SoundManager.play("SUSPENSE_WOBBLE")
	await get_tree().create_timer(config.DURATION * config.REPEATS + config.RETURN_DURATION).timeout

func clear_rings():
	for ring in rings:
		if is_instance_valid(ring):
			ring.queue_free()
	rings.clear()

func update_ui():
	score_label.text = "Level: %d" % level

func _input(event):
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		print("Mouse clicked at: ", event.position)
		if not game_active:
			print("Game not active, checking if can start. start_screen.visible: ", start_screen.visible)
			# If message label is showing (Game Over), restart. Otherwise, start from start screen.
			if message_label.text != "" or start_screen.visible:
				start_game()
