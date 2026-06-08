const API_URL =
"https://renovacao-barber-api.onrender.com/api/auth/login";

const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {

    const response = await fetch(API_URL,{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        email,
        password
      })
    });

    const data = await response.json();

    if(!response.ok){
      throw new Error(data.message);
    }

    localStorage.setItem("token",data.token);
    localStorage.setItem("user",JSON.stringify(data.user));

    window.location.href="./admin.html";

  } catch(error){

    document.getElementById("error").textContent =
    error.message;

  }
});