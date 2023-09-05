package com.min.webrtcexample.web;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.net.http.HttpRequest;

@Slf4j
@Controller
public class MainController {

    @GetMapping("/")
    public String moveMain() {
        log.info("moveMain ::: START");
        return "main";
    }

    @GetMapping("/join")
    public String moveShare(Model model, @RequestParam String name) {
        log.info("moveShare ::: START :: param = {}", name);
        model.addAttribute("name", name);

        return "join";
    }
}
