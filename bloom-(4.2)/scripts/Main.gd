extends Node2D

const RingScene = preload("res://scenes/Ring.tscn")

@onready var game_layer = $GameLayer
@onready var score_label = $UILayer/ScoreLabel
@onready var message_label = $UILayer/MessageLabel

var level: int = 1
var rings: Array = []
var is_transitioning: bool = false
var game_active: bool = false

func _ready():
	randomize()
	start_game()

func start_game():
	level = 1
	game_active = true
	is_transitioning = false
	message_label.text = ""
	update_ui()
	clear_rings()
	spawn_level()
	SoundManager.play("START_GAME")

func spawn_level():
	is_transitioning = true
	var colors = GameLogic.generate_round_colors(level)
	
	# Spawn rings from level down to 1 (outer to inner)
	# Bloom games usually have multiple rings as you level up
	# Let's say we show 'level' number of rings, but cap it at 5 for visual clarity
	var rings_to_spawn = min(level, 5)
	
	for i in range(rings_to_spawn):
		var ring = RingScene.instantiate()
		game_layer.add_child(ring)
		
		# Ring ID helps identify which ring was clicked
		var ring_id = i
		# Use level + i to vary ring configurations
		var config = GameLogic.get_ring_config(level - i)
		
		ring.setup(ring_id, config, colors)
		ring.petal_clicked.connect(_on_petal_clicked)
		rings.append(ring)
		ring.bloom()
		
		# Stagger ring appearance slightly
		await get_tree().create_timer(0.1).timeout
	
	# Activate only the innermost ring (last one spawned) for input
	for i in range(rings.size()):
		rings[i].set_active(i == rings.size() - 1)
	
	is_transitioning = false

func _on_petal_clicked(ring_id: int, petal_id: String):
	if is_transitioning or not game_active:
		return
		
	var ring = rings[ring_id]
	var petal = ring.get_petal(petal_id)
	
	if petal.is_odd:
		handle_level_up()
	else:
		handle_game_over()

func handle_level_up():
	is_transitioning = true
	SoundManager.play("LEVEL_UP")
	SoundManager.play_shepard("PETAL_POP", level)
	
	level += 1
	update_ui()
	
	# Wobble effect before clearing
	await suspense_wobble()
	
	clear_rings()
	await get_tree().create_timer(0.5).timeout
	spawn_level()

func handle_game_over():
	game_active = false
	SoundManager.play("GAME_OVER")
	message_label.text = "Game Over\nClick to Restart"
	
	# Scatter effect
	for ring in rings:
		ring.scatter()
	rings.clear()

func suspense_wobble():
	var tween = create_tween().set_parallel(true)
	var config = GameLogic.ANIMATION_CONFIG.WOBBLE
	
	for ring in rings:
		# Shake rotation
		for i in range(config.REPEATS):
			var offset = config.ROTATION_OFFSET if i % 2 == 0 else -config.ROTATION_OFFSET
			tween.tween_property(ring, "rotation_degrees", ring.rotation_degrees + offset, config.DURATION).set_trans(Tween.TRANS_SINE)
		
		# Return to base
		tween.chain().tween_property(ring, "rotation_degrees", ring.rotation_offset, config.RETURN_DURATION).set_ease(Tween.EASE_OUT)
	
	SoundManager.play("SUSPENSE_WOBBLE")
	await tween.finished

func clear_rings():
	for ring in rings:
		if is_instance_valid(ring):
			ring.queue_free()
	rings.clear()

func update_ui():
	score_label.text = "Level: %d" % level

func _input(event):
	if event is InputEventMouseButton and event.pressed:
		if not game_active:
			start_game()
