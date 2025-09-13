<script>
    import { fade, fly } from 'svelte/transition'

</script>

<svelte:head>
	<title>Not found!</title>
</svelte:head>


<div class="full-height" id="login-page-container" in:fade|global="{{ duration: 700 }}" out:fade|global="{{ duration: 1250 }}">
	<div class="row full-height " id="logo-container" in:fly|global="{{ y: -1000, duration: 700 }}" out:fly|global="{{ y: -1000, duration: 1100 }}">
		<div class="col align-self-center d-flex flex-column">
			<img src="/logo-512.png" alt="Lixpi Lists" />
		</div>
	</div>
	<div class="row full-height " id="not-found-container" in:fly|global="{{ y: 1000, duration: 700 }}" out:fly|global="{{ y: 1000, duration: 1100 }}">
        <h1>Not found</h1>

	</div>
</div>


<style lang="scss">
	.route-enter-active {
	    display: none;
	}
	#login-page-container {
	    position: fixed;
	    top: 0;
	    right: 0;
	    bottom: 0;
	    left: 0;
	    overflow: hidden;

	    // height: 100%;

	    &.route-exit-active {
	        // display: none;
	        #logo-container {
	            background: #fff;
	            img {
	                transform: translateY(-600%);
	            }
	        }
	        #login-form-container {
	            form {
	                transform: translateY(206%);
	            }
	        }
	    }
	    #logo-container {
	        height: 50%;
	        // min-height: 150px;
	        background: #7FA950;
	        -webkit-transition: all 1s cubic-bezier(0.585,-.6,.43,1.65);
	        -moz-transition: all 1s cubic-bezier(0.585,-.6,.43,1.65);
	        -ms-transition: all 1s cubic-bezier(0.585,-.6,.43,1.65);
	        -o-transition: all 1s cubic-bezier(0.585,-.6,.43,1.65);
	        transition: all 1s cubic-bezier(0.585,-.6,.43,1.65);
	        img {
	            margin: auto;
	            -webkit-transition: all .500s cubic-bezier(0.585,-.6,.43,1.65);
	            -moz-transition: all .500s cubic-bezier(0.585,-.6,.43,1.65);
	            -ms-transition: all .500s cubic-bezier(0.585,-.6,.43,1.65);
	            -o-transition: all .500s cubic-bezier(0.585,-.6,.43,1.65);
	            transition: all .500s cubic-bezier(0.585,-.6,.43,1.65);
	        }
	    }
	    #not-found-container {
			// text-align: center;
			margin: auto;
		}
	}

	input[type=text], input[type=password] {
		&.has-error {
			border: 1px solid red !important;
		}
	}
</style>
